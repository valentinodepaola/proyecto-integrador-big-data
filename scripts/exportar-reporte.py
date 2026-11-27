"""Genera los datos agregados del reporte web (docs/reporte/datos/agregados.js).

Lee la capa processed de 2022 a 2025 (la que deja la sección A2 de notebooks/fase3_pipeline_2022_2025.ipynb)
y calcula los mismos agregados que las gráficas de la sección C, pero como números en lugar de imágenes,
para que el reporte pueda dibujarlos con tooltips y filtros. Todo son conteos agregados: ningún registro
individual sale del data lake.

  celdas      incidentes por cuadro de 0.005 grados (~500 m), sin coordenadas imputadas      (pregunta 1)
  zonas       incidentes por beat y año                                                      (pregunta 1)
  distritos   incidentes por distrito y año                                                   (pregunta 1)
  dia_hora    incidentes por día de la semana y hora, sin hora imputada, por año              (pregunta 2)
  tipos       incidentes por tipo de delito y año                                             (pregunta 3)
  semanal     incidentes por semana (bloques de 7 días, 0 a 51) y año, total y 3 tipos        (pregunta 4)

Se escribe como un script que asigna el JSON a window.AGREGADOS, igual que exportar-vista.py, para que el
reporte también abra con doble clic.

Uso, desde la raíz del repo y con pandas<3 y pyarrow instalados:
  python scripts/exportar-reporte.py [carpeta del Parquet]

Sin argumento lee data/processed/crimes_2022_2025.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "data/processed/crimes_2022_2025"
SALIDA = RAIZ / "docs/reporte/datos/agregados.js"
PASO = 0.005                                   # el mismo cuadro que la pregunta 1 del notebook
DIAS = [2, 3, 4, 5, 6, 7, 1]                   # dia_semana: 1 = domingo; se ordena de lunes a domingo
TOP3 = ["THEFT", "BATTERY", "CRIMINAL DAMAGE"]
TIPOS_SESGO_PATRULLAJE = ["NARCOTICS", "WEAPONS VIOLATION"]


def main():
    df = pd.read_parquet(ENTRADA, columns=["fecha", "primary_type", "beat", "district", "latitude", "longitude",
                                           "anio", "dia_semana", "hora", "hora_imputada", "coord_imputada"])
    anios = sorted(int(a) for a in df["anio"].unique())
    salida = {"anios": anios, "total": int(len(df)),
              "por_anio": {str(a): int((df["anio"] == a).sum()) for a in anios},
              "hora_imputada": {str(a): int(df.loc[df["anio"] == a, "hora_imputada"].sum()) for a in anios},
              "tipos_excluidos": TIPOS_SESGO_PATRULLAJE}

    # Pregunta 1: cuadros de ~500 m, guardados como índices enteros a partir de una esquina
    geo = df[~df["coord_imputada"] & df["latitude"].notna()]
    ilat = np.floor(geo["latitude"] / PASO).astype(int)
    ilon = np.floor(geo["longitude"] / PASO).astype(int)
    base_lat, base_lon = int(ilat.min()), int(ilon.min())
    celdas = (pd.DataFrame({"anio": geo["anio"], "i": ilat - base_lat, "j": ilon - base_lon})
              .groupby(["anio", "i", "j"]).size())
    salida["celdas"] = {"paso": PASO, "lat0": base_lat * PASO, "lon0": base_lon * PASO,
                        "por_anio": {str(a): [[int(i), int(j), int(n)] for (i, j), n in celdas.loc[a].items()] for a in anios}}

    zonas = df.groupby(["beat", "anio"]).size().unstack(fill_value=0)
    salida["zonas"] = {str(b): [int(zonas.loc[b].get(a, 0)) for a in anios] for b in zonas.index}
    distritos = df.groupby(["district", "anio"]).size().unstack(fill_value=0)
    salida["distritos"] = {str(d): [int(distritos.loc[d].get(a, 0)) for a in anios] for d in distritos.index}

    # Pregunta 2: día por hora, sin los incidentes con hora imputada
    dh = (df[~df["hora_imputada"]].groupby(["anio", "dia_semana", "hora"]).size()
          .unstack(fill_value=0).reindex(columns=range(24), fill_value=0))
    salida["dia_hora"] = {str(a): [[int(v) for v in dh.loc[(a, d)]] for d in DIAS] for a in anios}

    # Pregunta 3: todos los tipos, por año
    tipos = df.groupby(["primary_type", "anio"]).size().unstack(fill_value=0)
    tipos = tipos.loc[tipos.sum(axis=1).sort_values(ascending=False).index]
    salida["tipos"] = {t: [int(tipos.loc[t].get(a, 0)) for a in anios] for t in tipos.index}

    # Pregunta 4: semanas de 7 días desde el 1 de enero (0 a 51), total y los tres tipos principales
    semana = (df["fecha"].dt.dayofyear - 1) // 7
    sem = (pd.DataFrame({"anio": df["anio"], "semana": semana,
                         "tipo": df["primary_type"].where(df["primary_type"].isin(TOP3), "OTROS")})
           .query("semana < 52").groupby(["anio", "semana", "tipo"]).size().unstack(fill_value=0))
    sem["TOTAL"] = sem.sum(axis=1)
    salida["semanal"] = {str(a): {c: [int(v) for v in sem.loc[a, c].reindex(range(52), fill_value=0)]
                                  for c in ["TOTAL", *TOP3]} for a in anios}

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(f"window.AGREGADOS = {json.dumps(salida, separators=(',', ':'), ensure_ascii=False)};\n")
    print(f"{SALIDA.relative_to(RAIZ)}: {SALIDA.stat().st_size / 1024:.0f} KiB")

    # Comprobación contra las cifras que publica el reporte (las de la pregunta 1 a 4 son de 2025)
    d25 = df[df["anio"] == 2025]
    c25 = celdas.loc[2025].sort_values(ascending=False)
    h25 = d25[~d25["hora_imputada"]].groupby("hora").size()
    t25 = d25["primary_type"].value_counts(normalize=True) * 100
    s25 = pd.Series(salida["semanal"]["2025"]["TOTAL"])
    inicio = [pd.Timestamp("2025-01-01") + pd.Timedelta(days=7 * k) for k in range(52)]   # como en el notebook
    verano = s25[[k for k, d in enumerate(inicio) if d.month in (6, 7, 8)]]
    print(f"Registros: {len(df):,} · 2025: {len(d25):,}")
    print(f"2025 · 10 % de cuadros concentra {c25.head(len(c25) // 10).sum() / c25.sum():.1%}")
    print(f"2025 · hora pico {h25.idxmax()} h · de 12 a 24 h: {h25.loc[12:].sum() / h25.sum():.1%}")
    print(f"2025 · robo {t25['THEFT']:.1f} % · agresión {t25['BATTERY']:.1f} % · daño {t25['CRIMINAL DAMAGE']:.1f} %")
    print(f"2025 · semana media {s25.mean():,.0f} · verano {verano.mean():,.0f} (+{verano.mean() / s25.mean() - 1:.1%})")


if __name__ == "__main__":
    main()
