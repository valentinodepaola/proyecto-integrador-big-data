"""Genera los datos de la vista del proyecto (docs/vista/, issue #19).

Lee las predicciones de prueba que guarda la sección B3 de notebooks/fase3_pipeline.ipynb
(curated/predicciones_2025) y baja los límites de los beats del portal de Chicago. Escribe dos
archivos chicos en docs/vista/datos/, solo con agregados por zona-turno y semana:

  predicciones_2025.json   incidentes reales y predicciones por beat, turno y semana de prueba
  beats.geojson            polígonos de los beats, con las coordenadas recortadas a 4 decimales

Uso, desde la raíz del repo y con pandas y pyarrow instalados:
  python scripts/exportar-vista.py [carpeta del Parquet]

Sin argumento lee data/curated/predicciones_2025 (la corrida local). Para usar la del clúster,
copia antes la carpeta de HDFS a la Mac (los pasos están en docs/Documentacion-General.md).
"""
import json
import sys
import urllib.request
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "data/curated/predicciones_2025"
SALIDA = RAIZ / "docs/vista/datos"
URL_BEATS = "https://data.cityofchicago.org/resource/n9it-hstw.geojson?$limit=1000"   # Boundaries - Police Beats (current)
DECIMALES = 4   # unos 10 m, de sobra para un mapa de toda la ciudad
TURNOS = ["00-06", "06-12", "12-18", "18-24"]


def exportar_predicciones():
    df = pd.read_parquet(ENTRADA)
    columnas = ["beat", "turno", "semana", "incidentes", "random_forest", "gbt", "promedio_historico", "senalada_rf"]
    df = df[columnas].sort_values(["semana", "beat", "turno"])
    df["beat"] = df["beat"].astype(int)

    captura = (df[df["senalada_rf"]].groupby("semana")["incidentes"].sum()
               / df.groupby("semana")["incidentes"].sum())
    total_captura = df.loc[df["senalada_rf"], "incidentes"].sum() / df["incidentes"].sum()

    datos = {
        "anio": int(pd.read_parquet(ENTRADA, columns=["anio"])["anio"].iloc[0]),
        "turnos": TURNOS,
        "semanas": sorted(int(s) for s in df["semana"].unique()),
        "captura_semanal": {int(s): round(float(c), 4) for s, c in captura.items()},
        "captura_total": round(float(total_captura), 4),
        "columnas": ["beat", "turno", "semana", "real", "rf", "gbt", "historico", "senalada"],
        "filas": [[int(f.beat), int(f.turno), int(f.semana), int(f.incidentes), round(float(f.random_forest), 2),
                   round(float(f.gbt), 2), round(float(f.promedio_historico), 2), int(f.senalada_rf)]
                  for f in df.itertuples(index=False)],
    }
    ruta = SALIDA / f"predicciones_{datos['anio']}.json"
    ruta.write_text(json.dumps(datos, separators=(",", ":")))
    print(f"{len(df):,} filas ({df['beat'].nunique()} beats, {len(datos['semanas'])} semanas) en {ruta.relative_to(RAIZ)}"
          f" · {ruta.stat().st_size / 1024:.0f} KB · captura de Random Forest {total_captura:.1%}")
    return set(df["beat"].unique())


def recortar(coordenadas):
    """Redondea un anillo y quita los puntos que quedan repetidos al redondear."""
    anillo = []
    for x, y in coordenadas:
        punto = [round(x, DECIMALES), round(y, DECIMALES)]
        if not anillo or punto != anillo[-1]:
            anillo.append(punto)
    return anillo


def exportar_beats(beats_con_datos):
    with urllib.request.urlopen(URL_BEATS, timeout=60) as respuesta:
        geo = json.load(respuesta)
    features = []
    for f in geo["features"]:
        beat = int(f["properties"]["beat_num"])
        geometria = f["geometry"]
        poligonos = geometria["coordinates"] if geometria["type"] == "MultiPolygon" else [geometria["coordinates"]]
        features.append({
            "type": "Feature",
            "properties": {"beat": beat, "district": int(f["properties"]["district"])},
            "geometry": {"type": "MultiPolygon",
                         "coordinates": [[recortar(anillo) for anillo in poligono] for poligono in poligonos]},
        })
    ruta = SALIDA / "beats.geojson"
    ruta.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))

    beats_mapa = {f["properties"]["beat"] for f in features}
    sin_poligono = sorted(beats_con_datos - beats_mapa)
    print(f"{len(features)} beats en {ruta.relative_to(RAIZ)} · {ruta.stat().st_size / 1024:.0f} KB")
    print("Beats con predicciones y sin polígono:", sin_poligono or "ninguno")
    print("Beats del mapa sin predicciones:", sorted(beats_mapa - beats_con_datos) or "ninguno")


if __name__ == "__main__":
    SALIDA.mkdir(parents=True, exist_ok=True)
    exportar_beats(exportar_predicciones())
