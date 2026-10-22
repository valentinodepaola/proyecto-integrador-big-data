# Notebooks de la Fase 3

Un notebook por hipótesis, todos a partir de [`00_plantilla_hipotesis.ipynb`](00_plantilla_hipotesis.ipynb).

## Flujo de trabajo

1. **Cada quien desarrolla en su compu** con el CSV de 2025 (`LOCAL = True`). Corre en segundos y no necesita la instancia.
2. **Sube su notebook al repo** cuando funcione.
3. **Valentino lo corre en la instancia** con el histórico completo (`LOCAL = False`) y sube el notebook ya ejecutado, con sus gráficas.
4. **Cada quien escribe su conclusión** con los resultados del histórico completo.

| Hipótesis | Responsable | Archivo |
|---|---|---|
| H1 · Concentración espacial persistente | David | `H1_concentracion_espacial.ipynb` |
| H2 · La hora predice más que el día | David | `H2_hora_vs_dia.ipynb` |
| H3 · Estacionalidad real | Lalo | `H3_estacionalidad.ipynb` |
| H4 · Hora imputada por tipo de delito | Lalo | `H4_hora_imputada.ipynb` |
| H5 · Sesgo de patrullaje / persistencia | Valentino | `H5_patrullaje_persistencia.ipynb` |

## Instalación en tu compu (una sola vez)

**1. Java 17 o 21** (Spark lo necesita):

- **Mac:** `brew install --cask temurin@21`
- **Windows:** instalar *Temurin 21 (LTS)* desde [adoptium.net](https://adoptium.net/); en el instalador, activar **Set JAVA_HOME variable**.

Comprobar con `java -version`.

**2. Python 3.10 o superior** y las librerías, de preferencia en un entorno virtual dentro de la carpeta del repo:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install "pyspark==4.2.0" "pandas<3" pyarrow matplotlib seaborn jupyterlab
```

> Se usa `pandas<3` porque PySpark 4.2 todavía no soporta pandas 3.

**3. El CSV de 2025** (unos 65 MB) en la carpeta `data/` del repo. Esa carpeta no se sube a GitHub.

```bash
mkdir -p data
curl -L -o data/Crimes_2025.csv "https://data.cityofchicago.org/api/views/t7ek-mgzi/rows.csv?accessType=DOWNLOAD"
```

En Windows también se puede abrir esa URL en el navegador y guardar el archivo como `data/Crimes_2025.csv`.

## Uso

1. Copia la plantilla con el nombre de tu hipótesis (tabla de arriba).
2. Abre Jupyter desde la carpeta del repo: `jupyter lab`.
3. En la celda de configuración, cambia `HIPOTESIS = "H1"` (o la tuya) y deja `LOCAL = True`.
4. Corre todo (*Run → Run All Cells*). La celda de carga debe decir unos **238 mil incidentes** (238,168 al 22/10/2026; el portal sigue agregando reportes tardíos de 2025, así que la cifra puede subir un poco).
5. Reemplaza el ejemplo de "incidentes por hora" con tu análisis.

## Reglas

- **Agregar en Spark, graficar en pandas.** Traer a pandas solo el resultado agregado con `.toPandas()`, nunca el DataFrame completo: el histórico tiene 8.6 millones de filas.
- **Guardar cada gráfica** con `guardar(fig, "nombre")`; queda en `notebooks/figuras/` para el reporte.
- **Terminar con `spark.stop()`.** En la instancia solo cabe una sesión de Spark a la vez.
- **No subir datos** (CSV o Parquet) al repo.
- **No cambiar `cargar_crimenes()`** en tu copia: si necesitas otra columna, avisa para agregarla en la plantilla y en la capa processed.

## Correr en la instancia (Valentino)

Con la instancia encendida y los servicios arriba (ver la rutina en [`docs/Guia-Instancia-AWS.md`](../docs/Guia-Instancia-AWS.md)):

```bash
# Mac → instancia
rsync -avz -e "ssh -i ~/.ssh/bigdata" --exclude figuras notebooks/ ubuntu@<IP>:~/notebooks/

# En Jupyter: abrir el notebook, poner LOCAL = False y correr todo

# Instancia → Mac (notebooks ejecutados y figuras)
rsync -avz -e "ssh -i ~/.ssh/bigdata" ubuntu@<IP>:~/notebooks/ notebooks/
```

La tabla `chicago.crimes` (capa processed) debe tener exactamente las columnas que documenta la plantilla, con las fechas interpretadas en UTC, igual que en `cargar_crimenes()`.
