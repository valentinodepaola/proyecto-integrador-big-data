# Fase 3 — Plan de trabajo

> Proyecto integrador de tecnologías de Big Data · Predicción de delitos en Chicago
> Fase 2 (diseño CRISP-DM): [Google Doc](https://docs.google.com/document/d/1j1llfIa9vETELeaJd5Plgcu2zRa5RBDYazHdIkCQM-Q/edit)
> Tareas: [project de GitHub](https://github.com/users/valentinodepaola/projects/5) (issues #1 a #9, con dependencias)
> Operación de la instancia: [Guia-Instancia-AWS.md](Guia-Instancia-AWS.md)

> **Replanteado el 22/10/2026.** Las primeras instrucciones que usamos (cronograma, instalar Hadoop y analizar cinco hipótesis) no eran las de esta fase. La actividad real es la de abajo. La infraestructura que ya montamos sirve completa; lo que cambió es el trabajo de análisis.

---

## Qué pide la Fase 3: "Del plan a los datos: pipeline y modelado con PySpark"

**Entrega: 31 de octubre de 2026 · 100 puntos · Python, PySpark, SparkML y HDFS**

Ejecutar las fases III (preparación de datos) y IV (modelado) de CRISP-DM sobre el dataset de las fases anteriores, en el clúster, siguiendo el plan de la Fase 2.

| Sección | Qué | Puntos |
|---|---|---|
| **A1** | Cargar el dataset desde HDFS y explorarlo: esquema, filas y columnas, estadísticas, tabla variable · tipo · % nulos · observaciones | 10 |
| **A2** | Limpieza: nulos según la estrategia de la Fase 2, duplicados exactos y valores atípicos (IQR o z-score, justificado) | 10 |
| **A3** | Feature engineering: `StringIndexer`/`OneHotEncoder`, `StandardScaler`/`MinMaxScaler`, al menos 2 variables nuevas, `VectorAssembler` | 10 |
| **A4** | Guardar el dataset preparado en Parquet en HDFS, con captura | (en A3 y evidencia) |
| **B1** | Modelo 1 en SparkML: división 80/20, entrenamiento, métricas e interpretación de negocio | 15 |
| **B2** | Modelo 2 en SparkML, igual que el anterior | 15 |
| **B3** | Tabla comparativa de los dos modelos y elección justificada | 10 |
| **C** | Exactamente 5 visualizaciones: título "Pregunta N: …", código reproducible y 3 a 5 oraciones de interpretación | 25 |
| **Evidencia** | Ejecución distribuida (Spark UI, HDFS, logs) y calidad general del notebook | 5 |

**Entregables**

1. **Un solo notebook** (`notebooks/fase3_pipeline.ipynb`) con las secciones A, B y C, texto explicando cada paso, y que corra de inicio a fin sin errores.
2. **Reporte en Word o PDF:** tabla de exploración, decisiones de limpieza justificadas, tabla comparativa de modelos, las 5 visualizaciones con su interpretación y conclusiones respecto a las preguntas analíticas.
3. **Capturas:** dataset crudo en HDFS, dataset limpio en Parquet en HDFS y Spark UI o log del clúster con al menos un job distribuido.

Los modelos de esta fase son la base de la Fase 4 (resultados e impacto de negocio).

---

## Infraestructura respecto a la Fase 2

En la Fase 2 planteamos una arquitectura objetivo para el escenario multi-ciudad: un clúster Hadoop de 4 nodos en Azure con Data Lake Storage, Airflow, Kafka, MLflow, una API REST y Power BI. Para esta fase implementamos una **versión mínima**:

1. **Costo.** El clúster de 4 nodos y los servicios administrados superan cualquier crédito gratuito o de estudiante.
2. **Disponibilidad.** Azure for Students no está disponible para nuestra institución; usamos **AWS** en plan gratuito (USD 100 de crédito).
3. **Tamaño de los datos.** La propia Fase 2 reconoce que los datos caben en una sola máquina; el clúster se justificaba por el escenario multi-ciudad.

| Pieza | En esta fase |
|---|---|
| Nube | AWS, `us-east-1`, cuenta en plan gratuito |
| Servidor | EC2 `m7i-flex.large` (2 vCPU, 8 GiB, 30 GB), Ubuntu 24.04, creada con Terraform ([`infra/`](../infra/)) |
| Almacenamiento | Hadoop 3.5.0 (HDFS + YARN) con Java 17, pseudo-distribuido ([`scripts/instalar-hadoop.sh`](../scripts/instalar-hadoop.sh)) |
| Procesamiento y modelos | Spark 4.2.0 + PySpark + SparkML sobre YARN, con JupyterLab ([`scripts/instalar-spark.sh`](../scripts/instalar-spark.sh)) |
| Consultas SQL | Spark SQL con catálogo Hive (metastore Derby), base `chicago` |
| Data lake | HDFS por capas: `raw` → `processed` → `curated` (+ `quarantine`) |
| Visualización | matplotlib, seaborn y plotly en el notebook |
| Fuera de esta fase | Airflow, Kafka, MLflow, API REST y Power BI |

---

## Plan de trabajo

| Issue | Sección | Qué | Responsable | Fecha | Depende de |
|---|---|---|---|---|---|
| #1 | A1 | Dataset en HDFS y exploración inicial | Valentino | 23 oct | — |
| #2 | A2 | Limpieza: nulos, duplicados y atípicos | Valentino | 24 oct | #1 |
| #3 | A3 y A4 | Features por zona y turno, Parquet en HDFS | Valentino | 25 oct | #2 |
| #4 | B1 | Modelo 1: `GBTRegressor` | Valentino | 26 oct | #3 |
| #5 | B2 | Modelo 2: `RandomForestRegressor` | Valentino | 27 oct | #3 |
| #6 | B3 | Comparación y elección del modelo | Valentino | 28 oct | #4, #5 |
| #7 | C | Las 5 visualizaciones | Lalo | 28 oct | #2 |
| #8 | Evidencia | Capturas de ejecución distribuida | Valentino | 29 oct | #6 |
| #9 | Entregables | Notebook único y reporte | Valentino y Lalo | 30 oct | #6, #7, #8 |

Lalo puede empezar #7 desde ya en su compu con el CSV de 2025 y la plantilla (`notebooks/README.md`); solo la corrida final necesita #2.

---

## Decisiones propuestas (por confirmar)

| Tema | Propuesta | Por qué |
|---|---|---|
| Dataset | Crímenes 2025 (`t7ek-mgzi`); el histórico completo queda como opcional | Es el dataset de las fases anteriores y lo que pide la actividad |
| Unidad de análisis | Zona-turno: beat × bloque de 6 h × semana | Así se reparten las patrullas; decidido en la Fase 2 |
| Modelos | `GBTRegressor` contra `RandomForestRegressor`, prediciendo incidentes por zona-turno | Es la pareja que definió la Fase 2 (GBT con Random Forest de contraste) y permite compararlos sobre la misma pregunta |
| División 80/20 | Por fecha: primeras 80 % de semanas para entrenar, últimas 20 % para probar | Con datos en el tiempo, una división aleatoria deja que el modelo "vea el futuro" |
| Métricas | RMSE, MAE y R², más tasa de captura y PAI de la Fase 2 | Las técnicas las pide la actividad; las de negocio son las que entiende el mando |
| Valores atípicos | IQR sobre coordenadas; eliminar solo los imposibles (fuera de Chicago) | Los extremos reales (zonas con muchos delitos) son justo lo que queremos detectar |
| Exclusiones para modelar | Sin hora imputada; sin NARCOTICS ni WEAPONS VIOLATION | Hora desconocida y sesgo de patrullaje, como en la Fase 2 |
| 5 preguntas analíticas | (1) dónde se concentran, (2) a qué horas y días, (3) qué tipos predominan, (4) cómo evolucionan en el año, (5) qué tan desigual es la carga entre zonas y turnos | La Fase 2 tiene una sola pregunta general; la actividad pide numerarlas en cada gráfica |

---

## Qué se reaprovecha del trabajo previo

- **Infraestructura completa** (AWS, Terraform, Hadoop, Spark, Jupyter): es el requisito previo de esta fase.
- **Reglas de limpieza de la Fase 2** (hora imputada, coordenadas con el centro del beat, `DESCONOCIDO`): son la base de A2.
- **Plantilla de notebooks** ([`notebooks/00_plantilla.ipynb`](../notebooks/00_plantilla.ipynb)): su carga de datos sirve para A1 y A2, y para que Lalo prototipe C en local.
- **Hipótesis planteadas** (concentración espacial, hora contra día, estacionalidad, hora imputada por tipo): se convierten en preguntas para las visualizaciones.
- **Cronograma** en [Google Sheets](https://docs.google.com/spreadsheets/d/10YlytnRe1zkorUshp-m4lVZnoRnIBb-bMqZ8wN35ZU4/edit): ya no se califica y quedó desactualizado; el plan vigente es la tabla de arriba y el project.

---

## Evidencia a recopilar

| Para | Capturas |
|---|---|
| Entregable 3 (a) | `hdfs dfs -ls` del CSV crudo en `/datalake/raw/` |
| Entregable 3 (b) | `hdfs dfs -ls` del Parquet en `/datalake/curated/` (y `processed/`) |
| Entregable 3 (c) | Spark UI con el DAG y las etapas completadas del entrenamiento de un modelo; aplicación en YARN |
| Contexto de la infraestructura | Terraform, instancia en EC2, `jps`, interfaces de HDFS y YARN, Spark sobre YARN y Jupyter (ya tomadas) |
