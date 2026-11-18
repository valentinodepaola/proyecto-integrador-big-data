# Guía de la instancia AWS — `hadoop-bigdata`

> Cómo encender, detener, conectarse y mantener la instancia de la Fase 3.
> Código de la infraestructura: [`infra/`](../infra/) · Plan general: [Fase3-Plan-y-Alcance.md](Fase3-Plan-y-Alcance.md)

---

## 1. Qué tenemos

| Dato | Valor |
|---|---|
| Cuenta AWS | `964515698813` (cuenta personal de Valentino, plan gratuito, USD 100 de crédito) |
| Región | `us-east-1` (Norte de Virginia) |
| Instancia | `i-0806080a3fc3c8e73` · nombre `hadoop-bigdata` |
| Tipo | `m7i-flex.large` · 2 vCPU · 8 GiB RAM (apta para nivel gratuito) |
| Sistema | Ubuntu 24.04 LTS · usuario `ubuntu` |
| Disco | 30 GB gp3 |
| Acceso | Solo SSH (puerto 22) desde las IPs autorizadas |
| Llave SSH | `~/.ssh/bigdata` (privada) · `~/.ssh/bigdata.pub` (pública) |
| Perfil AWS CLI | `bigdata` (usuario IAM `terraform-bigdata`) |

> ⚠️ **La IP pública cambia cada vez que la instancia se detiene y se vuelve a encender.** Siempre consúltala antes de conectarte (sección 3).

---

## Rutina de cada sesión de trabajo

Todo lo instalado (Hadoop, Spark, Jupyter, datos de HDFS, notebooks) se conserva al apagar la instancia. Lo que hay que repetir cada vez es encender y arrancar los servicios:

**Al empezar**

| # | Dónde | Qué | Comando |
|---|---|---|---|
| 1 | Mac | Encender la instancia | `aws ec2 start-instances --instance-ids i-0806080a3fc3c8e73 --profile bigdata` |
| 2 | Mac | Esperar y ver la IP nueva | `aws ec2 wait instance-running --instance-ids i-0806080a3fc3c8e73 --profile bigdata && aws ec2 describe-instances --instance-ids i-0806080a3fc3c8e73 --profile bigdata --query 'Reservations[0].Instances[0].PublicIpAddress' --output text` |
| 3 | Mac | Conectarse | `ssh -i ~/.ssh/bigdata ubuntu@<IP>` |
| 4 | Instancia | Arrancar Hadoop | `start-dfs.sh && start-yarn.sh` |
| 5 | Instancia | Arrancar historial de Spark y Jupyter | `$SPARK_HOME/sbin/start-history-server.sh; nohup ~/venv/bin/jupyter lab --no-browser --ip=127.0.0.1 --port=8888 --notebook-dir=$HOME/notebooks > ~/jupyter.log 2>&1 &` |
| 6 | Instancia | Comprobar y obtener la URL de Jupyter | `jps; sleep 5; ~/venv/bin/jupyter server list` |
| 7 | Mac (otra pestaña) | Abrir el túnel | `ssh -i ~/.ssh/bigdata -N -L 9870:localhost:9870 -L 8088:localhost:8088 -L 8888:localhost:8888 -L 4040:localhost:4040 -L 18080:localhost:18080 ubuntu@<IP>` |
| 8 | Navegador | Abrir Jupyter | La URL del paso 6 |

**Al terminar**

| # | Dónde | Qué | Comando |
|---|---|---|---|
| 1 | Jupyter | Cerrar la sesión de Spark del notebook | `spark.stop()` |
| 2 | Instancia | Detener los servicios | `~/venv/bin/jupyter server stop 8888; $SPARK_HOME/sbin/stop-history-server.sh; stop-yarn.sh && stop-dfs.sh` |
| 3 | Instancia | Salir | `exit` |
| 4 | Mac | Cerrar el túnel | `Ctrl + C` en su pestaña |
| 5 | Mac | Apagar la instancia | `aws ec2 stop-instances --instance-ids i-0806080a3fc3c8e73 --profile bigdata` |

> ⚠️ **No juntes los pasos 4 y 5 en una sola línea con `&` al final.** Así todos los servicios quedan colgados de tu sesión SSH y, cuando la terminal se cierra o se corta, Linux les manda `SIGHUP` y el ResourceManager de YARN se apaga (pasó el 23/10/2026). Solo Jupyter va con `nohup … &`.
> Si en el paso 3 o 7 SSH se queda colgado (*Connection timed out*), tu IP cambió: corre `cd infra && terraform apply -target=aws_security_group.hadoop` (sección 4).
> Si un enlace de Spark o YARN abre `ip-172-31-20-93:...` y no carga, cambia `ip-172-31-20-93` por `localhost` en la URL.

Las secciones siguientes explican cada paso con más detalle.

---

## 2. Reglas de oro

1. **Detener la instancia al terminar cada sesión.** Encendida gasta crédito aunque nadie la use.
2. **Siempre usar `--profile bigdata`.** El perfil `default` de la Mac es de otra cuenta.
3. **Nunca compartir ni subir a GitHub:** `~/.ssh/bigdata`, las claves de acceso de AWS, ni los archivos `*.tfstate` / `tfplan`.
4. **Detener ≠ destruir.** Detener conserva el disco; `terraform destroy` lo borra todo.

---

## 3. Uso diario

Todos los comandos se corren desde la Mac.

### Encender

```bash
aws ec2 start-instances --instance-ids i-0806080a3fc3c8e73 --profile bigdata
aws ec2 wait instance-running --instance-ids i-0806080a3fc3c8e73 --profile bigdata
```

### Ver la IP pública actual

```bash
aws ec2 describe-instances --instance-ids i-0806080a3fc3c8e73 --profile bigdata \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

### Conectarse

```bash
ssh -i ~/.ssh/bigdata ubuntu@<IP>
```

> La primera vez que te conectes a una IP nueva, SSH pregunta si confías en el servidor: responde `yes`.

### Detener

```bash
aws ec2 stop-instances --instance-ids i-0806080a3fc3c8e73 --profile bigdata
```

También se puede detener desde dentro de la instancia: `sudo shutdown -h now`.

### Ver el estado

```bash
aws ec2 describe-instances --instance-ids i-0806080a3fc3c8e73 --profile bigdata \
  --query 'Reservations[0].Instances[0].State.Name' --output text
```

Estados: `pending` → `running` → `stopping` → `stopped`.

### Desde la consola web (alternativa)

EC2 → Instancias → seleccionar `hadoop-bigdata` → **Estado de la instancia** → *Iniciar* / *Detener*. La IP aparece en **Dirección IPv4 pública**.

> ❌ **No usar "Terminar instancia"**: la borra junto con su disco.

---

## 3.1 Hadoop, Spark y Jupyter: arrancar y detener los servicios

Nada de esto **arranca solo** al encender la instancia. Dentro de la instancia (`ssh` primero):

```bash
# Arrancar (en este orden)
start-dfs.sh && start-yarn.sh
$SPARK_HOME/sbin/start-history-server.sh
nohup ~/venv/bin/jupyter lab --no-browser --ip=127.0.0.1 --port=8888 --notebook-dir=$HOME/notebooks > ~/jupyter.log 2>&1 &
jps                                # NameNode, DataNode, SecondaryNameNode, ResourceManager, NodeManager, HistoryServer
sleep 5; ~/venv/bin/jupyter server list   # URL de Jupyter con su token

# Detener (antes de apagar la instancia)
~/venv/bin/jupyter server stop 8888
$SPARK_HOME/sbin/stop-history-server.sh
stop-yarn.sh && stop-dfs.sh
```

**Orden recomendado para apagar todo:** detener los servicios → salir de la instancia → detener la instancia (sección 3).

> ❌ **Nunca volver a correr `hdfs namenode -format`**: borra todo lo que haya en HDFS. Solo se hizo una vez, en la instalación.

> ⚠️ **Una sola sesión de Spark a la vez.** El catálogo de Hive usa Derby, que no admite dos sesiones simultáneas. Al terminar con un notebook, correr `spark.stop()`.

| Dato | Valor |
|---|---|
| Java | OpenJDK 17 (Hadoop 3.5 no corre con Java 11) |
| Hadoop | 3.5.0 en `/opt/hadoop` · configuración en `/opt/hadoop/etc/hadoop` |
| Datos de HDFS | `/home/ubuntu/hadoop-data` (replicación 1) |
| YARN | 5 GB de RAM y 2 núcleos |
| Spark | 4.2.0 en `/opt/spark`, sobre YARN · driver 1 GB + 2 ejecutores de 1 GB |
| Catálogo Hive | Metastore Derby en `~/hive-metastore` · tablas en `hdfs:///user/hive/warehouse` |
| Python | `~/venv`: PySpark 4.2.0, JupyterLab, pandas 2, pyarrow, matplotlib, seaborn, plotly |
| Notebooks | `~/notebooks` (los ve Jupyter) |
| Data lake | `/datalake/raw`, `/processed`, `/curated`, `/quarantine` |
| Dataset crudo | `/datalake/raw/crimes_<año>/fecha=AAAA-MM-DD/Crimes_<año>.csv` (+ `_ingesta.json`), de 2022 a 2025, cargado con [`scripts/ingesta-raw.sh <año>`](../scripts/ingesta-raw.sh) (sin año, 2025). La fecha que imprime va en `FECHAS_RAW` del notebook |
| Scripts de instalación | [`instalar-hadoop.sh`](../scripts/instalar-hadoop.sh) y luego [`instalar-spark.sh`](../scripts/instalar-spark.sh) (para una instancia nueva) |

---

## 4. Si cambias de red (casa, uni, datos del celular)

El SSH solo acepta las IPs registradas. Si te conectas desde otra red, `ssh` termina con *Connection timed out* o *Connection refused*. Para registrar tu IP nueva:

```bash
cd infra
terraform apply -target=aws_security_group.hadoop
```

Terraform detecta tu IP actual y actualiza solo la regla del grupo de seguridad. Antes de confirmar con `yes`, revisa que el plan diga `Plan: 0 to add, 1 to change, 0 to destroy` y que el cambio sea la IP en `aws_security_group.hadoop`.

> ⚠️ **Si un plan dice `must be replaced` o `destroy` en `aws_instance.hadoop`, no lo confirmes:** recrear la instancia borra HDFS y todo lo instalado. Desde el 18/11/2026 `infra/main.tf` ignora los cambios de AMI (Ubuntu publica una nueva cada pocas semanas y antes eso forzaba el reemplazo), pero el `-target` evita cualquier sorpresa.

---

## 5. Ver las interfaces web (HDFS, YARN, Jupyter, Spark)

No se abren puertos al internet: se usa un **túnel SSH**. Con este comando abierto en una terminal:

```bash
ssh -i ~/.ssh/bigdata \
  -L 9870:localhost:9870 \
  -L 8088:localhost:8088 \
  -L 8888:localhost:8888 \
  -L 4040:localhost:4040 \
  -L 18080:localhost:18080 \
  ubuntu@<IP>
```

…se abren en el navegador de la Mac:

| Servicio | URL local |
|---|---|
| HDFS NameNode | http://localhost:9870 |
| YARN ResourceManager | http://localhost:8088 |
| Jupyter | URL con token de `jupyter server list` (empieza con http://127.0.0.1:8888) |
| Spark UI (mientras hay una sesión abierta) | http://localhost:4040 |
| Historial de Spark | http://localhost:18080 |

> El túnel se abre **desde la Mac**, no dentro de la instancia.

---

## 6. Copiar archivos

```bash
# Mac → instancia
scp -i ~/.ssh/bigdata archivo.csv ubuntu@<IP>:~/

# Instancia → Mac
scp -i ~/.ssh/bigdata ubuntu@<IP>:~/resultados/grafica.png .

# Carpetas completas (sincroniza solo lo que cambió)
rsync -avz -e "ssh -i ~/.ssh/bigdata" ./notebooks/ ubuntu@<IP>:~/notebooks/
```

---

## 7. Acceso para Carlos y Eduardo

Cada quien usa **su propia llave**; nunca se comparte `~/.ssh/bigdata`.

**Lo que hace cada compañero en su computadora:**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/bigdata -C "nombre-bigdata"
curl https://checkip.amazonaws.com
```

Y le manda a Valentino **solo** el contenido de `~/.ssh/bigdata.pub` (la pública) y su IP.

**Lo que hace Valentino:**

1. Agregar la llave pública del compañero dentro de la instancia:
   ```bash
   ssh -i ~/.ssh/bigdata ubuntu@<IP>
   echo "ssh-ed25519 AAAA... nombre-bigdata" >> ~/.ssh/authorized_keys
   ```
2. Autorizar su IP en `infra/terraform.tfvars` (este archivo no se sube a GitHub):
   ```hcl
   extra_ssh_cidrs = ["201.x.x.x/32", "189.x.x.x/32"]
   ```
3. Aplicar: `cd infra && terraform apply -target=aws_security_group.hadoop`, revisando que el plan solo cambie el grupo de seguridad.

> Solo Valentino puede encender y detener la instancia (tiene las credenciales de AWS). Hay que coordinar quién la apaga al terminar.

---

## 8. Costos y crédito

| Situación | Qué se cobra (contra el crédito) |
|---|---|
| Encendida | Cómputo (≈ USD 0.10/hora) + disco + IP pública |
| Detenida | Solo el disco de 30 GB (unos pocos dólares al mes) |
| Destruida | Nada |

- **Ver crédito restante:** consola → Administración de facturación y costos → **Créditos**.
- **Alerta:** hay un presupuesto mensual de USD 5 que avisa por correo al 85 % y 100 %.
- **Vigencia del plan gratuito:** consola → Facturación → **Nivel gratuito**.
- Con el plan gratuito AWS no cobra a la tarjeta. Al agotarse el crédito o vencer el plan, se pierde el acceso a los recursos a menos que se pase a un plan de pago (confirmar condiciones en **Nivel gratuito**). Respaldar antes de que eso pase.

---

## 9. Terraform: crear, recrear y borrar

Desde la carpeta `infra/`:

| Comando | Qué hace |
|---|---|
| `terraform plan` | Muestra qué cambiaría, **sin hacer nada** |
| `terraform apply` | Crea o actualiza lo que falte (pide confirmar con `yes`). Lee el plan antes: nunca confirmes un `must be replaced` de la instancia |
| `terraform apply -replace=aws_instance.hadoop` | Recrea la instancia a propósito, con la AMI de Ubuntu más reciente (llega vacía) |
| `terraform output` | Muestra ID, IP y comando ssh guardados* |
| `terraform destroy` | **Borra todo**: instancia, disco, grupo de seguridad y llave |

\* `terraform output` muestra la IP del último `apply`. Si la instancia se detuvo y se volvió a encender, usa el comando de la sección 3 o actualiza con `terraform apply -refresh-only`.

**Cuándo destruir:** al terminar el proyecto, o si algo quedó muy roto y conviene empezar de cero. Una instancia recreada **llega vacía** (sin Hadoop ni datos) y con una IP nueva; Hadoop se reinstala con `scripts/instalar-hadoop.sh`.

**Antes de destruir:** respaldar notebooks, resultados y gráficas con `scp`/`rsync` (sección 6).

---

## 10. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `ssh` se queda colgado / *Connection timed out* o *Connection refused* | Tu IP cambió, o la instancia está detenida o todavía arrancando | `terraform apply -target=aws_security_group.hadoop` (sección 4) y revisa el estado (sección 3) |
| *Permission denied (publickey)* | Llave o usuario equivocados | Usa `-i ~/.ssh/bigdata` y el usuario `ubuntu` |
| *UNPROTECTED PRIVATE KEY FILE* | Permisos de la llave muy abiertos | `chmod 600 ~/.ssh/bigdata` |
| *REMOTE HOST IDENTIFICATION HAS CHANGED* | La IP ahora es de otra instancia (p. ej. tras recrear) | `ssh-keygen -R <IP>` y vuelve a conectar |
| *InsufficientInstanceCapacity* al encender | AWS sin capacidad momentánea de ese tipo | Esperar unos minutos y reintentar |
| Error de credenciales en Terraform o AWS CLI | Perfil mal configurado | `aws sts get-caller-identity --profile bigdata` debe mostrar la cuenta `964515698813` |
| La instancia va muy lenta o se cuelga | Poca RAM para lo que corre | Revisar con `free -h`; detener servicios que no se usen |
| Spark no arranca o un job falla con *Failed to exec spawn helper* / *Incorrect Java version … jspawnhelper* | Ubuntu actualizó Java con `unattended-upgrades` mientras YARN estaba corriendo (pasó el 18/11/2026, unos minutos después de encender) | Reiniciar los servicios: `stop-yarn.sh && stop-dfs.sh`, luego `start-dfs.sh && start-yarn.sh` y el historial de Spark. Para que no vuelva a pasar, excluir Java de las actualizaciones automáticas (ya lo hace `scripts/instalar-hadoop.sh`; en la instancia actual se corre una vez): `echo 'Unattended-Upgrade::Package-Blacklist { "openjdk-17-"; };' \| sudo tee /etc/apt/apt.conf.d/51no-actualizar-java`. Java se actualiza a mano con los servicios detenidos |
