#!/usr/bin/env bash
# Instala Spark sobre YARN, PySpark y JupyterLab. Requiere Hadoop ya instalado y corriendo
# (scripts/instalar-hadoop.sh). Se corre dentro de la instancia EC2, como el usuario ubuntu:
#   bash instalar-spark.sh
# Es el mismo procedimiento que se siguió a mano el 22/10/2026 (Spark 4.2.0 + Java 17).
set -euo pipefail

SPARK_DIR=/opt/spark
MIRROR=https://dlcdn.apache.org/spark
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export HADOOP_HOME=/opt/hadoop HADOOP_CONF_DIR=/opt/hadoop/etc/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin

echo "== 1. Descargar Spark 4 (última versión) =="
if [ ! -d "$SPARK_DIR" ]; then
  SPARK_VER=$(curl -s "$MIRROR/" | grep -oE 'spark-4\.[0-9]+\.[0-9]+' | sort -V | tail -1 | sed 's/spark-//')
  [ -n "$SPARK_VER" ] || { echo "No se encontró Spark 4 en $MIRROR"; exit 1; }
  TGZ=spark-$SPARK_VER-bin-hadoop3.tgz
  cd ~
  wget -q --show-progress "$MIRROR/spark-$SPARK_VER/$TGZ" "$MIRROR/spark-$SPARK_VER/$TGZ.sha512"
  sha512sum -c "$TGZ.sha512"
  sudo tar -xzf "$TGZ" -C /opt
  sudo mv "/opt/${TGZ%.tgz}" "$SPARK_DIR"
  sudo chown -R ubuntu:ubuntu "$SPARK_DIR"
  rm "$TGZ" "$TGZ.sha512"
fi
SPARK_VER=$("$SPARK_DIR/bin/spark-submit" --version 2>&1 | grep -oE 'version [0-9.]+' | head -1 | cut -d' ' -f2)

echo "== 2. Variables de entorno =="
if ! grep -q 'SPARK_HOME' ~/.bashrc; then
  cat >> ~/.bashrc <<'EOF'

# Spark
export SPARK_HOME=/opt/spark
export PATH=$PATH:$SPARK_HOME/bin
export PYSPARK_PYTHON=$HOME/venv/bin/python
export PYSPARK_DRIVER_PYTHON=$HOME/venv/bin/python
EOF
fi
export SPARK_HOME=$SPARK_DIR PATH=$PATH:$SPARK_DIR/bin

echo "== 3. Configuración: YARN, historial en HDFS y catálogo Hive (Derby) =="
hdfs dfs -mkdir -p /spark-logs /spark-jars /user/ubuntu /user/hive/warehouse
mkdir -p ~/hive-metastore

# Las librerías de Spark se suben una vez a HDFS para no copiarlas en cada sesión
if ! hdfs dfs -test -e /spark-jars/spark-libs.jar; then
  (cd "$SPARK_HOME/jars" && jar cf0 /tmp/spark-libs.jar *)
  hdfs dfs -put -f /tmp/spark-libs.jar /spark-jars/
  rm /tmp/spark-libs.jar
fi

cat > "$SPARK_HOME/conf/spark-env.sh" <<'EOF'
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export HADOOP_CONF_DIR=/opt/hadoop/etc/hadoop
export PYSPARK_PYTHON=/home/ubuntu/venv/bin/python
EOF

# Driver 1 GB + 2 ejecutores de 1 GB: caben en los 5 GB de YARN
cat > "$SPARK_HOME/conf/spark-defaults.conf" <<'EOF'
spark.master                     yarn
spark.submit.deployMode          client
spark.driver.memory              1g
spark.executor.memory            1g
spark.executor.cores             1
spark.executor.instances         2
spark.yarn.archive               hdfs://localhost:9000/spark-jars/spark-libs.jar
spark.eventLog.enabled           true
spark.eventLog.dir               hdfs://localhost:9000/spark-logs
spark.history.fs.logDirectory    hdfs://localhost:9000/spark-logs
spark.sql.catalogImplementation  hive
spark.sql.warehouse.dir          hdfs://localhost:9000/user/hive/warehouse
spark.hadoop.javax.jdo.option.ConnectionURL  jdbc:derby:;databaseName=/home/ubuntu/hive-metastore/metastore_db;create=true
spark.driver.extraJavaOptions    -Dderby.stream.error.file=/home/ubuntu/hive-metastore/derby.log
EOF

echo "== 4. Entorno de Python: PySpark, Jupyter y librerías de análisis =="
sudo apt-get install -y -q python3-venv
[ -d ~/venv ] || python3 -m venv ~/venv
~/venv/bin/pip install -q --upgrade pip
# PySpark 4.2 todavía no soporta pandas 3
~/venv/bin/pip install -q "pyspark==$SPARK_VER" jupyterlab "pandas<3" pyarrow matplotlib seaborn
mkdir -p ~/notebooks

echo "== 5. Prueba: Spark sobre YARN =="
spark-submit --class org.apache.spark.examples.SparkPi "$SPARK_HOME"/examples/jars/spark-examples_*.jar 20 2>&1 | grep "Pi is roughly"

echo "Listo. Para arrancar Jupyter y el historial de Spark, ver docs/Guia-Instancia-AWS.md (sección 3.1)."
