# Proyecto integrador de tecnologías de Big Data

Predicción de delitos en Chicago (dónde, cuándo y qué tipo) con datos abiertos del Departamento de Policía. Equipo: Valentino, David (Carlos David) y Lalo (Eduardo).

**Fase actual: 3** — infraestructura Big Data y análisis de cinco hipótesis. **Entrega: 31 de octubre de 2026.**

## Dónde está cada cosa

| Ruta | Contenido |
|---|---|
| `docs/Fase3-Plan-y-Alcance.md` | Qué se hace en la fase, por qué cambió respecto a la Fase 2 y las 5 hipótesis |
| `docs/Guia-Instancia-AWS.md` | Operación de la instancia: rutina de inicio y cierre, túnel, servicios, problemas comunes |
| `infra/` | Terraform de la instancia EC2 |
| `scripts/` | `instalar-hadoop.sh` e `instalar-spark.sh` (reinstalación en una instancia nueva) |
| `notebooks/` | Un notebook por hipótesis a partir de `00_plantilla_hipotesis.ipynb`; reglas en `notebooks/README.md` |
| `evidencia/` | Capturas para el reporte |

Fuera del repo: Fase 2 en Google Docs, cronograma en Google Sheets (enlaces en `docs/Fase3-Plan-y-Alcance.md`), tareas en el project de GitHub "Proyecto Integrador Big Data — Fase 3" (issues #1 a #9, con dependencias marcadas).

## Infraestructura

- AWS, cuenta personal de Valentino en plan gratuito, región `us-east-1`. **Usar siempre `--profile bigdata`**: el perfil `default` de la Mac es de otra cuenta.
- Una instancia EC2 `m7i-flex.large` (`i-0806080a3fc3c8e73`), Ubuntu 24.04, usuario `ubuntu`, llave `~/.ssh/bigdata`. La IP pública cambia en cada encendido.
- Stack: Java 17, Hadoop 3.5.0 (HDFS + YARN pseudo-distribuido), Spark 4.2.0 sobre YARN, catálogo Hive con metastore Derby, JupyterLab en `~/venv`.
- Data lake en HDFS: `/datalake/{raw,processed,curated,quarantine}`. Tablas en la base Hive `chicago`.

Reglas que no se rompen:

- **Los servicios no arrancan solos** al encender la instancia; la rutina está al inicio de la guía.
- **Apagar todo al terminar** (servicios y luego la instancia): encendida gasta crédito.
- **Nunca correr `hdfs namenode -format`**: borra HDFS.
- **Una sola sesión de Spark a la vez** (Derby no admite dos y YARN tiene 5 GB). Terminar los notebooks con `spark.stop()`.
- Hadoop 3.5 **no corre con Java 11**; PySpark 4.2 **no soporta pandas 3** (usar `pandas<3`).
- Los enlaces de YARN/Spark que apunten a `ip-172-31-20-93` se abren cambiando ese nombre por `localhost` (todo pasa por túnel SSH; no se abren puertos).

## Flujo de trabajo de las hipótesis

1. Cada quien desarrolla su notebook en local con el CSV de 2025 (`LOCAL = True`).
2. Lo sube al repo.
3. Valentino lo corre en la instancia con el histórico completo (`LOCAL = False`) y sube el notebook ejecutado.

La tabla `chicago.crimes` (capa processed) debe tener exactamente las columnas que documenta la plantilla, con fechas en UTC. No modificar `cargar_crimenes()` en las copias de la plantilla.

## Convenciones

- Todo en español (documentación, issues, notebooks); identificadores de código en inglés o snake_case en español como ya están.
- No subir al repo datos (`*.csv`, `*.parquet`, `data/`), estado de Terraform (`*.tfstate`, `tfplan`) ni llaves o credenciales. El `.gitignore` ya los excluye.
- Si cambia la infraestructura o el flujo, actualizar `docs/Guia-Instancia-AWS.md` y, si aplica, los scripts de instalación.
