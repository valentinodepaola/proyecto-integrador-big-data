# Proyecto integrador de tecnologías de Big Data

Predicción de delitos en Chicago (dónde, cuándo y qué tipo) con datos abiertos del Departamento de Policía. Equipo: Valentino, David (Carlos David) y Lalo (Eduardo).

**Estado: Fase 3 terminada** (entrega del 31 de octubre de 2026); la **Fase 4** (resultados e impacto de negocio) está por arrancar. La vista general del proyecto (arquitectura, datos, resultados, decisiones y próximos pasos) está en `docs/Documentacion-General.md`. Cada fase tiene su propio `docs/FaseN-Plan-y-Alcance.md`; la Fase 3 fue pipeline y modelado con PySpark: preparación de datos (A), dos modelos de SparkML (B) y cinco visualizaciones (C) en un solo notebook, más el reporte.

## Dónde está cada cosa

| Ruta | Contenido |
|---|---|
| `docs/Documentacion-General.md` | Vista general: arquitectura, data lake, pipeline, resultados, decisiones que aplican a todo el proyecto y próximos pasos. Se actualiza al cerrar cada fase |
| `docs/Fase3-Plan-y-Alcance.md` | Qué pide la Fase 3, plan por issue, decisiones y cómo cambió la infraestructura respecto a la Fase 2 |
| `docs/Guia-Instancia-AWS.md` | Operación de la instancia: rutina de inicio y cierre, túnel, servicios, problemas comunes |
| `infra/` | Terraform de la instancia EC2 |
| `scripts/` | `instalar-hadoop.sh` e `instalar-spark.sh` (reinstalación en una instancia nueva) e `ingesta-raw.sh` (descarga el CSV de 2025 a la capa raw de HDFS) |
| `notebooks/` | Notebook final `fase3_pipeline.ipynb` (secciones A, B y C) y la plantilla `00_plantilla.ipynb` para prototipar en local; reglas en `notebooks/README.md` |
| `evidencia/` | Capturas para el reporte, una carpeta por tipo; índice en `evidencia/README.md` |

Fuera del repo: Fase 2 en Google Docs, cronograma en Google Sheets (enlaces en `docs/Fase3-Plan-y-Alcance.md`), tareas en el project de GitHub "Proyecto Integrador Big Data", uno solo para todas las fases (Fase 3: issues #1 a #9; lo que sigue: #19 a #22).

## Infraestructura

- AWS, cuenta personal de Valentino en plan gratuito, región `us-east-1`. **Usar siempre `--profile bigdata`**: el perfil `default` de la Mac es de otra cuenta.
- Una instancia EC2 `m7i-flex.large` (`i-0806080a3fc3c8e73`), Ubuntu 24.04, usuario `ubuntu`, llave `~/.ssh/bigdata`. La IP pública cambia en cada encendido.
- Stack: Java 17, Hadoop 3.5.0 (HDFS + YARN pseudo-distribuido), Spark 4.2.0 sobre YARN, catálogo Hive con metastore Derby, JupyterLab en `~/venv`.
- Data lake en HDFS: `/datalake/{raw,processed,curated,quarantine}`. Tablas en la base Hive `chicago`. El CSV crudo está en `/datalake/raw/crimes_2025/fecha=<fecha de descarga>/`; el notebook lo lee según `FECHA_RAW`.

Reglas que no se rompen:

- **Los servicios no arrancan solos** al encender la instancia; la rutina está al inicio de la guía. No arrancarlos en una sola línea terminada en `&`: al cerrarse la sesión SSH, YARN recibe `SIGHUP` y se apaga.
- **Apagar todo al terminar** (servicios y luego la instancia): encendida gasta crédito.
- **Nunca correr `hdfs namenode -format`**: borra HDFS.
- **Una sola sesión de Spark a la vez** (Derby no admite dos y YARN tiene 5 GB). Terminar los notebooks con `spark.stop()`.
- Hadoop 3.5 **no corre con Java 11**; PySpark 4.2 **no soporta pandas 3** (usar `pandas<3`).
- Los enlaces de YARN/Spark que apunten a `ip-172-31-20-93` se abren cambiando ese nombre por `localhost` (todo pasa por túnel SSH; no se abren puertos).

## Flujo de trabajo

1. `notebooks/fase3_pipeline.ipynb` tiene A, B y C. Los cambios se prueban primero en local con el CSV de 2025 (`LOCAL = True`).
2. La corrida final es en la instancia (`LOCAL = False`), de inicio a fin, y se suben el notebook ejecutado y las figuras de `notebooks/figuras/`.
3. El notebook final tiene que correr completo sin errores después de reiniciar el kernel.

El dataset limpio (capa processed, tabla `chicago.crimes`) debe tener exactamente las columnas que documenta la plantilla, con fechas en UTC. No modificar `cargar_crimenes()` en las copias de la plantilla.

## Convenciones

- Todo en español (documentación, issues, notebooks); identificadores de código en inglés o snake_case en español como ya están.
- No subir al repo datos (`*.csv`, `*.parquet`, `data/`), estado de Terraform (`*.tfstate`, `tfplan`) ni llaves o credenciales. El `.gitignore` ya los excluye.
- Si cambia la infraestructura o el flujo, actualizar `docs/Guia-Instancia-AWS.md` y, si aplica, los scripts de instalación.
