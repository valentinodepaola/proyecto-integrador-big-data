# Notebooks de la Fase 3

El entregable es **un solo notebook**, `fase3_pipeline.ipynb`, con las secciones A (preparación de datos), B (modelos de SparkML) y C (visualizaciones). Tiene que correr de inicio a fin sin errores.

La plantilla [`00_plantilla.ipynb`](00_plantilla.ipynb) sirve para prototipar en tu compu con el mismo código que después corre en la instancia: solo cambia `LOCAL`.

## Quién hace qué

| Sección | Responsable | Issues | Archivo |
|---|---|---|---|
| A · Preparación (A1 a A4) | Valentino | #1, #2, #3 | `fase3_pipeline.ipynb` |
| B · Modelado (B1 a B3) | Valentino | #4, #5, #6 | `fase3_pipeline.ipynb` |
| C · 5 visualizaciones | Valentino | #7 | `fase3_pipeline.ipynb` (figuras en `figuras/`) |
| Evidencia, notebook final y reporte | Valentino (y Lalo en el reporte) | #8, #9 | `fase3_pipeline.ipynb` |

## Flujo de trabajo

1. **Las secciones A, B y C están en `fase3_pipeline.ipynb`.** Antes de prender la instancia se prueban en la compu con el CSV de 2025 (`LOCAL = True`).
2. **La corrida final es en la instancia** (`LOCAL = False`) con los datos limpios de HDFS, y se sube el notebook ejecutado con sus figuras.
3. **Años.** `ANIOS = [2025]` reproduce la Fase 3. `ANIOS = [2022, 2023, 2024, 2025]` repite el pipeline con cuatro años (issue #20): sus rutas y tablas llevan el sufijo `_2022_2025` y no pisan las de 2025. La sección B4 junta las métricas de las dos corridas, así que hay que correr el notebook una vez con cada valor. La corrida ejecutada de cuatro años se guarda aparte como `fase3_pipeline_2022_2025.ipynb`, con sus figuras `C_*_2022_2025_cluster.png`.
4. **Variables nuevas (#21).** `variables_nuevas.ipynb` parte de las tablas de 2022 a 2025 que deja la corrida de cuatro años, así que va después de ella. Necesita además el clima: `bash scripts/ingesta-clima.sh` en la instancia, o `LOCAL=1 bash scripts/ingesta-clima.sh` para dejarlo en `data/`.
5. **La plantilla sirve para prototipar** un análisis nuevo en tu compu antes de pasarlo al notebook final.

## Instalación en tu compu (una sola vez)

**1. Java 17 o 21** (Spark lo necesita):

- **Mac:** `brew install --cask temurin@21`
- **Windows:** instalar *Temurin 21 (LTS)* desde [adoptium.net](https://adoptium.net/); en el instalador, activar **Set JAVA_HOME variable**.

Comprobar con `java -version`.

**2. Python 3.10 o superior** y las librerías, de preferencia en un entorno virtual dentro de la carpeta del repo:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install "pyspark==4.2.0" "pandas<3" pyarrow matplotlib seaborn plotly jupyterlab
```

> Se usa `pandas<3` porque PySpark 4.2 todavía no soporta pandas 3.

**3. Los CSV** (unos 58 MB por año) en la carpeta `data/` del repo. Esa carpeta no se sube a GitHub. Para la Fase 3 basta 2025; para la corrida de cuatro años hacen falta también 2022, 2023 y 2024.

```bash
mkdir -p data
curl -L -o data/Crimes_2025.csv "https://data.cityofchicago.org/api/views/t7ek-mgzi/rows.csv?accessType=DOWNLOAD"
curl -L -o data/Crimes_2024.csv "https://data.cityofchicago.org/api/views/dqcy-ctma/rows.csv?accessType=DOWNLOAD"
curl -L -o data/Crimes_2023.csv "https://data.cityofchicago.org/api/views/xguy-4ndq/rows.csv?accessType=DOWNLOAD"
curl -L -o data/Crimes_2022.csv "https://data.cityofchicago.org/api/views/9hwr-2zxp/rows.csv?accessType=DOWNLOAD"
```

En Windows también se puede abrir cada URL en el navegador y guardar el archivo como `data/Crimes_<año>.csv`.

> En Mac, si Spark falla al arrancar con *Can't assign requested address: Service 'sparkDriver'*, abre Jupyter con `SPARK_LOCAL_IP=127.0.0.1 jupyter lab`. Si tienes varias versiones de Java, usa la 21: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`.

## Uso de la plantilla

1. Cópiala con un nombre propio (por ejemplo `C_visualizaciones.ipynb`).
2. Abre Jupyter desde la carpeta del repo: `jupyter lab`.
3. En la celda de configuración deja `LOCAL = True` y `PARTE = "C"` (o la sección que corresponda).
4. Corre todo (*Run → Run All Cells*). La celda de carga debe decir unos **238 mil incidentes** (238,168 al 22/10/2026; el portal sigue agregando reportes tardíos de 2025, así que la cifra puede subir un poco).
5. Reemplaza el ejemplo de "incidentes por hora" con tu análisis.

## Reglas

- **Cada gráfica empieza su título con "Pregunta N:"** y lleva de 3 a 5 oraciones de interpretación en lenguaje de negocio (lo pide la actividad).
- **Agregar en Spark, graficar en pandas.** Traer a pandas solo el resultado agregado con `.toPandas()`, nunca el DataFrame completo.
- **Guardar cada gráfica** con `guardar(fig, "nombre")`; queda en `notebooks/figuras/` para el reporte.
- **Terminar con `spark.stop()`.** En la instancia solo cabe una sesión de Spark a la vez.
- **No subir datos** (CSV o Parquet) al repo.
- **No cambiar `cargar_crimenes()`** en tu copia: si necesitas otra columna, avisa para agregarla en la plantilla y en la limpieza (#2).

## Correr en la instancia (Valentino)

Con la instancia encendida y los servicios arriba (ver la rutina en [`docs/Guia-Instancia-AWS.md`](../docs/Guia-Instancia-AWS.md)):

```bash
# Mac → instancia
rsync -avz -e "ssh -i ~/.ssh/bigdata" --exclude figuras notebooks/ ubuntu@<IP>:~/notebooks/

# En Jupyter: abrir el notebook, poner LOCAL = False (y ANIOS) y correr todo

# Instancia → Mac (notebooks ejecutados y figuras)
rsync -avz -e "ssh -i ~/.ssh/bigdata" ubuntu@<IP>:~/notebooks/ notebooks/
```

El dataset limpio (`chicago.crimes`, capa processed) debe tener exactamente las columnas que documenta la plantilla, con las fechas interpretadas en UTC, igual que en `cargar_crimenes()`.
