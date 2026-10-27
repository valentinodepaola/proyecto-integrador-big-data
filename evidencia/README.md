# Evidencia de la Fase 3

Capturas del pipeline corriendo en la instancia (HDFS + Spark sobre YARN), ordenadas por tipo. El reporte que las usa es el [Google Doc de la Fase 3](https://docs.google.com/document/d/1busfqhp9NKxw8cqSSDjHEdvcW76X-H7xUQmDmYC-Li0/edit).

El Entregable 3 pide tres capturas:

| Entregable 3 | Captura |
|---|---|
| (a) Dataset crudo en HDFS | [`01_datos_hdfs/01_csv_crudo_en_hdfs.png`](01_datos_hdfs/01_csv_crudo_en_hdfs.png) |
| (b) Dataset limpio en Parquet en HDFS | [`02_parquet_hdfs/00_processed_crimes_2025.png`](02_parquet_hdfs/00_processed_crimes_2025.png) y [`02_parquet_hdfs/01_curated_zona_turno_2025.png`](02_parquet_hdfs/01_curated_zona_turno_2025.png) |
| (c) Spark UI o log del clúster con un job distribuido | [`03_spark_yarn/03_dag_entrenamiento_rf.jpg`](03_spark_yarn/03_dag_entrenamiento_rf.jpg), [`03_spark_yarn/04_etapas_entrenamiento_rf.jpg`](03_spark_yarn/04_etapas_entrenamiento_rf.jpg) y [`03_spark_yarn/07_aplicacion_finished_en_yarn.png`](03_spark_yarn/07_aplicacion_finished_en_yarn.png) |

El notebook también lo deja impreso al final, en la sección "Evidencia de ejecución en el clúster": ID de la aplicación en YARN, master, ejecutores y tamaño de cada capa del data lake.

## 01 · Datos crudos en HDFS

| Archivo | Qué muestra |
|---|---|
| `00_ingesta_raw_a_hdfs.png` | `scripts/ingesta-raw.sh`: descarga del CSV, conteo contra la API del portal (238,174) y subida a HDFS |
| `01_csv_crudo_en_hdfs.png` | Explorador del NameNode en `/datalake/raw/crimes_2025/fecha=2026-10-23/`: `Crimes_2025.csv` (55 MB) y `_ingesta.json` |

## 02 · Parquet en HDFS

| Archivo | Qué muestra |
|---|---|
| `00_processed_crimes_2025.png` | `/datalake/processed/crimes_2025/`: dataset limpio de A2 (tabla `chicago.crimes`), dos archivos Parquet de unos 5.3 MB |
| `01_curated_zona_turno_2025.png` | `/datalake/curated/zona_turno_2025/`: dataset preparado de A3 y A4 (tabla `chicago.zona_turno`) que leen los modelos |
| `02_cuarentena_crimes_2025.png` | `/datalake/quarantine/crimes_2025/fecha=2026-10-23/`: registros ilegibles de A2; esta vez solo el encabezado |

## 03 · Spark y YARN

| Archivo | Qué muestra |
|---|---|
| `00_historial_jobs_a1.webp` | Historial de Spark: jobs de la exploración de A1 (aplicación `application_1792782389485_0001`) |
| `01_historial_dag_a1.png` | Historial de Spark: DAG de un job de A1 |
| `02_job_entrenamiento_rf.jpg` | Job "B2 · entrenamiento Random Forest" con sus dos etapas completadas |
| `03_dag_entrenamiento_rf.jpg` | DAG de un job del entrenamiento de Random Forest: lee `chicago.zona_turno` desde Parquet y junta lo que calculan los ejecutores |
| `04_etapas_entrenamiento_rf.jpg` | Etapas completadas del entrenamiento de Random Forest, 2 tareas por etapa |
| `05_jobs_entrenamiento_gbt.png` | Jobs "B1 · entrenamiento GBT" en el historial (aplicación `application_1792994240112_0001`) |
| `06_ejecutores_en_yarn.png` | Pestaña Executors: driver, dos ejecutores en contenedores de YARN y el `yarn-am` |
| `07_aplicacion_finished_en_yarn.png` | ResourceManager: `fase3-pipeline-cluster` en estado FINISHED / SUCCEEDED |

## 04 · Instalación

| Archivo | Qué muestra |
|---|---|
| `00_java_17_y_hadoop.png` | Java 17 y Hadoop 3.5.0 |
| `01_core_site_xml.png` | `core-site.xml`: HDFS en `hdfs://localhost:9000` |
| `02_jps_servicios.png` | `jps`: NameNode, DataNode, SecondaryNameNode, ResourceManager y NodeManager |
| `03_hdfs_dfsadmin_report.png` | `hdfs dfsadmin -report`: capacidad de HDFS (28 GB) |
| `04_capas_del_datalake.png` | Creación de las capas `raw`, `processed`, `curated` y `quarantine` |
| `05_mapreduce_pi_en_yarn.png` | Job de ejemplo de MapReduce (Pi) terminado en YARN |
| `06_spark_version.png` | Spark 4.2.0 |
| `07_spark_defaults_conf.png` | `spark-defaults.conf`: master `yarn`, 2 ejecutores, historial y catálogo Hive |
| `08_sparkpi_en_yarn.png` | SparkPi sobre YARN |
| `09_pyspark_y_jupyter_version.png` | PySpark y JupyterLab en `~/venv` (después se bajó pandas a `<3`) |
| `10_pyspark_hive_en_yarn.png` | Prueba de PySpark: escribe Parquet en HDFS, crea `chicago.prueba` en Hive y corre con master `yarn` |
| `11_jupyter_spark_en_yarn.png` | JupyterLab con una sesión de Spark sobre YARN |

## 05 · Salidas del notebook

Capturas de `notebooks/fase3_pipeline.ipynb` para el reporte. Las cinco gráficas de C están en [`notebooks/figuras/`](../notebooks/figuras/).

| Archivo | Sección | Qué muestra |
|---|---|---|
| `00_notebook_configuracion.png` | Inicio | Encabezado y configuración (`LOCAL`, `FECHA_RAW`, sesión de Spark) |
| `01_carga_hdfs_y_esquema.png` | A1 | Carga desde HDFS y esquema: 238,174 filas y 22 columnas |
| `02_estadisticas_y_valores_distintos.png` | A1 | Estadísticas de las columnas numéricas y valores distintos de las categóricas |
| `03_tipos_de_delito.png` | A1 | Los 10 tipos de delito más frecuentes |
| `04_tabla_de_variables.png` | A1 | Tabla variable · tipo · nulos · observaciones |
| `05_valores_atipicos_iqr.png` | A2 | IQR sobre las coordenadas: 1,786 atípicos, casi todos en O'Hare |
| `06_resumen_de_la_limpieza.png` | A2 | Cuántos registros tocó cada paso de la limpieza |
| `07_vector_de_features.png` | A3 | Pipeline de SparkML y vector de 28 posiciones |
| `08_metricas_y_metas_gbt.png` | B1 | Métricas de GBT contra las referencias y las metas de la Fase 2 |
| `09_importancia_gbt.png` | B1 | Importancia de las variables en GBT |
| `10_importancia_random_forest.png` | B2 | Importancia de las variables en Random Forest |
| `11_captura_semanal.png` | B3 | Tasa de captura semana a semana de los dos modelos |

> Los enlaces de YARN y Spark que apuntan a `ip-172-31-20-93` se abren cambiando ese nombre por `localhost` (todo pasa por el túnel SSH de la [guía](../docs/Guia-Instancia-AWS.md)).
