#!/usr/bin/env bash
# Instala Hadoop (HDFS + YARN) en modo pseudo-distribuido sobre Ubuntu 24.04.
# Se corre dentro de la instancia EC2, como el usuario ubuntu:
#   bash instalar-hadoop.sh
# Es el mismo procedimiento que se siguió a mano el 22/10/2026 (Hadoop 3.5.0 + Java 17).
set -euo pipefail

JAVA_HOME_DIR=/usr/lib/jvm/java-17-openjdk-amd64
HADOOP_DIR=/opt/hadoop
DATA_DIR=$HOME/hadoop-data
MIRROR=https://dlcdn.apache.org/hadoop/common/stable

echo "== 1. Java 17 (Hadoop 3.5 no corre con Java 11) =="
sudo apt-get update -q
sudo apt-get install -y -q openjdk-17-jdk-headless
java -version
# unattended-upgrades actualiza Java solo; si pasa con YARN corriendo, los contenedores nuevos
# fallan con "Failed to exec spawn helper" hasta reiniciar los servicios (18/11/2026).
# Java se actualiza a mano, con los servicios detenidos: sudo apt-get install --only-upgrade openjdk-17-jdk-headless
echo 'Unattended-Upgrade::Package-Blacklist { "openjdk-17-"; };' | sudo tee /etc/apt/apt.conf.d/51no-actualizar-java >/dev/null

echo "== 2. SSH sin contraseña a localhost (lo usan start-dfs.sh / start-yarn.sh) =="
[ -f ~/.ssh/id_ed25519 ] || ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
grep -qf ~/.ssh/id_ed25519.pub ~/.ssh/authorized_keys || cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
ssh -o StrictHostKeyChecking=accept-new localhost exit
ssh -o StrictHostKeyChecking=accept-new 0.0.0.0 exit

echo "== 3. Descargar Hadoop (versión estable) =="
if [ ! -d "$HADOOP_DIR" ]; then
  TGZ=$(curl -s "$MIRROR/" | grep -oE 'hadoop-[0-9.]+\.tar\.gz' | head -1)
  [ -n "$TGZ" ] || { echo "No se encontró la versión estable en $MIRROR"; exit 1; }
  cd ~
  wget -q --show-progress "$MIRROR/$TGZ" "$MIRROR/$TGZ.sha512"
  sha512sum -c "$TGZ.sha512"
  sudo tar -xzf "$TGZ" -C /opt
  sudo mv "/opt/${TGZ%.tar.gz}" "$HADOOP_DIR"
  sudo chown -R ubuntu:ubuntu "$HADOOP_DIR"
  rm "$TGZ" "$TGZ.sha512"
fi

echo "== 4. Variables de entorno =="
if ! grep -q 'HADOOP_HOME' ~/.bashrc; then
  cat >> ~/.bashrc <<EOF

# Hadoop
export JAVA_HOME=$JAVA_HOME_DIR
export HADOOP_HOME=$HADOOP_DIR
export HADOOP_CONF_DIR=\$HADOOP_HOME/etc/hadoop
export PATH=\$PATH:\$HADOOP_HOME/bin:\$HADOOP_HOME/sbin
EOF
fi
export JAVA_HOME=$JAVA_HOME_DIR HADOOP_HOME=$HADOOP_DIR
export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin
hadoop version | head -1

echo "== 5. Configuración =="
mkdir -p "$DATA_DIR"/{namenode,datanode,tmp}
grep -q "^export JAVA_HOME=$JAVA_HOME_DIR" "$HADOOP_CONF_DIR/hadoop-env.sh" \
  || echo "export JAVA_HOME=$JAVA_HOME_DIR" >> "$HADOOP_CONF_DIR/hadoop-env.sh"

cat > "$HADOOP_CONF_DIR/core-site.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <property><name>fs.defaultFS</name><value>hdfs://localhost:9000</value></property>
  <property><name>hadoop.tmp.dir</name><value>$DATA_DIR/tmp</value></property>
</configuration>
EOF

cat > "$HADOOP_CONF_DIR/hdfs-site.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <property><name>dfs.replication</name><value>1</value></property>
  <property><name>dfs.namenode.name.dir</name><value>file://$DATA_DIR/namenode</value></property>
  <property><name>dfs.datanode.data.dir</name><value>file://$DATA_DIR/datanode</value></property>
</configuration>
EOF

cat > "$HADOOP_CONF_DIR/mapred-site.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <property><name>mapreduce.framework.name</name><value>yarn</value></property>
  <property>
    <name>mapreduce.application.classpath</name>
    <value>$HADOOP_MAPRED_HOME/share/hadoop/mapreduce/*:$HADOOP_MAPRED_HOME/share/hadoop/mapreduce/lib/*</value>
  </property>
</configuration>
EOF

# YARN: 5 GB y 2 núcleos; el resto de los 8 GB queda para el sistema y Jupyter
cat > "$HADOOP_CONF_DIR/yarn-site.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <property><name>yarn.nodemanager.aux-services</name><value>mapreduce_shuffle</value></property>
  <property>
    <name>yarn.nodemanager.env-whitelist</name>
    <value>JAVA_HOME,HADOOP_COMMON_HOME,HADOOP_HDFS_HOME,HADOOP_CONF_DIR,CLASSPATH_PREPEND_DISTCACHE,HADOOP_YARN_HOME,HADOOP_HOME,PATH,LANG,TZ,HADOOP_MAPRED_HOME</value>
  </property>
  <property><name>yarn.nodemanager.resource.memory-mb</name><value>5120</value></property>
  <property><name>yarn.nodemanager.resource.cpu-vcores</name><value>2</value></property>
  <property><name>yarn.scheduler.minimum-allocation-mb</name><value>512</value></property>
  <property><name>yarn.scheduler.maximum-allocation-mb</name><value>5120</value></property>
  <property><name>yarn.nodemanager.vmem-check-enabled</name><value>false</value></property>
</configuration>
EOF

echo "== 6. Formatear HDFS (solo la primera vez) y levantar servicios =="
[ -d "$DATA_DIR/namenode/current" ] || hdfs namenode -format -nonInteractive
start-dfs.sh
start-yarn.sh
jps

echo "== 7. Capas del data lake =="
hdfs dfs -mkdir -p /datalake/{raw,processed,curated,quarantine}
hdfs dfs -ls /datalake

echo "Listo. Interfaces: HDFS en :9870 y YARN en :8088 (por túnel SSH)."
