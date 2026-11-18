#!/usr/bin/env bash
# Descarga el clima diario de 2022 a 2025 en el aeropuerto O'Hare y lo guarda en la capa raw de HDFS.
# Lo usa notebooks/variables_nuevas.ipynb (issue #21). Se corre dentro de la instancia EC2, con HDFS arriba:
#   bash ingesta-clima.sh
# Con LOCAL=1 solo deja el CSV en data/ (para probar el notebook en la compu):
#   LOCAL=1 bash scripts/ingesta-clima.sh
# Fuente: archivo histórico de Open-Meteo (reanálisis ERA5), sin llave. Temperatura media en °C,
# lluvia y nieve del día en mm y cm, con los días en hora de Chicago.
set -euo pipefail

LAT=41.9786
LON=-87.9048
DESDE=2022-01-01
HASTA=2025-12-31
URL="https://archive-api.open-meteo.com/v1/archive?latitude=$LAT&longitude=$LON&start_date=$DESDE&end_date=$HASTA&daily=temperature_2m_mean,precipitation_sum,snowfall_sum&timezone=America%2FChicago"
FECHA=$(date +%F)

if [ "${LOCAL:-0}" = "1" ]; then
  LOCAL_DIR=$(cd "$(dirname "$0")/.." && pwd)/data
else
  LOCAL_DIR=$HOME/ingesta
fi
ARCHIVO=$LOCAL_DIR/clima_ohare.csv
HDFS_DIR=/datalake/raw/clima_ohare/fecha=$FECHA

echo "== 1. Descarga =="
mkdir -p "$LOCAL_DIR"
curl -sSL --fail "$URL" | python3 -c '
import csv, json, sys
d = json.load(sys.stdin)["daily"]
escritor = csv.writer(open(sys.argv[1], "w", newline=""))
escritor.writerow(["fecha", "temperatura_media", "lluvia_mm", "nieve_cm"])
filas = list(zip(d["time"], d["temperature_2m_mean"], d["precipitation_sum"], d["snowfall_sum"]))
escritor.writerows(filas)
vacios = sum(1 for f in filas if None in f)
print(f"{len(filas)} días · {vacios} con algún dato vacío")
' "$ARCHIVO"

if [ "${LOCAL:-0}" = "1" ]; then
  echo "Listo: $ARCHIVO"
  exit 0
fi

echo "== 2. Subida a HDFS =="
export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}
export PATH=$PATH:/opt/hadoop/bin
hdfs dfs -mkdir -p "$HDFS_DIR"
hdfs dfs -put -f "$ARCHIVO" "$HDFS_DIR/"
hdfs dfs -ls -h "$HDFS_DIR"

echo "Listo. En el notebook usa FECHA_CLIMA = \"$FECHA\""
