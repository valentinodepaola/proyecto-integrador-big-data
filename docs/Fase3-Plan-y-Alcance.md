# Fase 3 — Plan de trabajo

> Proyecto integrador de tecnologías de Big Data · Predicción de delitos en Chicago
> Fase 2 (diseño CRISP-DM): [Google Doc](https://docs.google.com/document/d/1j1llfIa9vETELeaJd5Plgcu2zRa5RBDYazHdIkCQM-Q/edit)
> Operación de la instancia: [Guia-Instancia-AWS.md](Guia-Instancia-AWS.md)
> Cronograma (28 sep – 31 oct 2026): [Google Sheets](https://docs.google.com/spreadsheets/d/10YlytnRe1zkorUshp-m4lVZnoRnIBb-bMqZ8wN35ZU4/edit)

---

## Contexto: qué cambia respecto a la Fase 2

En la Fase 2 planteamos una **arquitectura objetivo** pensada para el escenario multi-ciudad: un clúster Hadoop de 4 nodos (28 vCPU, 112 GB RAM) en Azure, con Data Lake Storage Gen2, Airflow, Kafka, MLflow, una API REST y Power BI.

Para la Fase 3 implementamos una **versión mínima** de esa arquitectura, por tres razones:

1. **Costo.** El clúster de 4 nodos y los servicios administrados (como HDInsight) superan cualquier crédito gratuito o de estudiante.
2. **Disponibilidad de la nube.** Azure for Students no está disponible para nuestra institución, así que usamos **AWS** con una cuenta en plan gratuito (USD 100 de crédito).
3. **Alcance de la fase.** La Fase 3 pide instalar Hadoop, PySpark y la infraestructura necesaria, y analizar cinco hipótesis. El modelado y el despliegue corresponden a fases posteriores. Además, la propia Fase 2 reconoce que el histórico completo (0.53 GB en Parquet) cabe en una sola máquina.

La Fase 2 se mantiene como la arquitectura a la que apunta el proyecto. Esta fase implementa la parte que se necesita para los análisis:

| Componente en la Fase 2 | En la Fase 3 |
|---|---|
| Clúster Hadoop de 4 nodos en Azure | Hadoop (HDFS + YARN) en **una instancia EC2** de AWS, creada con Terraform |
| Spark / PySpark | **Se mantiene**, sobre YARN y con Jupyter |
| Hive | Spark SQL con metastore de Hive |
| ADLS Gen2 con capas raw / processed / curated | Las **mismas capas como carpetas en HDFS**, más `quarantine` |
| Parquet + Snappy | **Se mantiene** |
| Airflow | Script de Python para la ingesta |
| Kafka, MLflow, API REST | Fuera de esta fase |
| Power BI | Gráficos generados con código en los notebooks |

---

## Objetivo y entregables

**Objetivo:** ejecutar el análisis de información en una infraestructura para Big Data.

| # | Entregable | Puntos |
|---|---|---|
| 1 | Cronograma de actividades por fase de ejecución, con los cinco análisis | 25 |
| 2 | Hadoop instalado y configurado, con evidencia | 10 |
| 3 | PySpark e infraestructura necesaria instalados, con evidencia | 15 |
| 4 | Análisis de las cinco hipótesis con gráficos e información de valor | **50** |

---

## Infraestructura

| Pieza | Detalle |
|---|---|
| Nube | AWS, región `us-east-1`, cuenta en plan gratuito |
| Servidor | EC2 `m7i-flex.large` (2 vCPU, 8 GiB RAM, 30 GB), Ubuntu 24.04 LTS |
| Infraestructura como código | Terraform, en [`infra/`](../infra/) |
| Almacenamiento distribuido | Hadoop HDFS + YARN, instalado a mano (pseudo-distribuido; opcional: 3 DataNodes en Docker para mostrar la replicación ×3) |
| Procesamiento | Apache Spark + PySpark sobre YARN, con Jupyter |
| Consultas SQL | Spark SQL con metastore de Hive |
| Datos | Histórico completo de Chicago (8,631,202 incidentes), en HDFS por capas: `raw` → `processed` → `curated` (+ `quarantine`) |
| Análisis y gráficos | Notebooks de PySpark con matplotlib / seaborn |

---

## Hipótesis

Salen de los hallazgos de la Fase 2 y se prueban sobre el **histórico completo**, no solo sobre 2025.

1. **Concentración espacial persistente.** Pocas zonas concentran la mayoría de los delitos (en 2025, el 13 % de las áreas tuvo el 34.4 % de los incidentes), y son las mismas año con año.
   *Evidencia:* curva de Lorenz y coeficiente de Gini por año; ranking de zonas a lo largo del tiempo.
2. **La hora predice más que el día.** La variación dentro del día (385 %) es mucho mayor que entre días de la semana (6.7 %).
   *Evidencia:* heatmap de día × hora y comparación de varianzas.
3. **Estacionalidad real.** El pico de verano (julio vs. febrero, +37 % en 2025) se repite en los ~25 años del histórico.
   *Evidencia:* serie mensual de varios años y descomposición estacional.
4. **La hora imputada depende del tipo de delito.** Los delitos que se descubren después tienen más registros a las 00:00 o 12:00 (DECEPTIVE PRACTICE 20.67 % vs. ROBBERY 1.81 %).
   *Evidencia:* porcentaje de hora imputada por `Primary Type`.
5. **Sesgo de patrullaje o persistencia** (elegir una):
   - Los delitos con tasa de arresto alta (NARCOTICS 96.1 %, WEAPONS 78.2 %) se concentran donde hay más presencia policial.
   - El conteo de la semana anterior predice el de la semana actual por zona-turno.

---

## Actividades

- [x] Armar el cronograma de actividades (entregable 1) → [Google Sheets](https://docs.google.com/spreadsheets/d/10YlytnRe1zkorUshp-m4lVZnoRnIBb-bMqZ8wN35ZU4/edit).
- [ ] Validar con el profesor el alcance de la infraestructura.
- [x] Crear la instancia EC2 con Terraform.
- [ ] Instalar y configurar Hadoop (HDFS + YARN).
- [ ] Instalar Spark, PySpark, Jupyter y el metastore de Hive.
- [ ] Descargar el histórico completo y cargarlo a HDFS (`raw` → `processed` → `curated`).
- [ ] Cerrar la redacción de las cinco hipótesis.
- [ ] Analizar cada hipótesis con PySpark y generar sus gráficos.
- [ ] Agregar a la Fase 2 una nota sobre el alcance implementado en la Fase 3.
- [ ] Integrar la evidencia en el reporte final.

---

## Evidencia a recopilar

| Entregable | Capturas sugeridas |
|---|---|
| Infraestructura | Código de Terraform y salida de `terraform apply`; instancia "En ejecución" en la consola de EC2 |
| Hadoop | Comandos de instalación; `jps` con los procesos; interfaz de HDFS (puerto 9870) y de YARN (puerto 8088); `hdfs dfs -ls` con las capas |
| PySpark | `pyspark --version`; sesión de Spark corriendo sobre YARN; interfaz de Spark (puerto 4040) durante un trabajo |
| Hipótesis | Cada notebook con su código, gráfico y conclusión |
