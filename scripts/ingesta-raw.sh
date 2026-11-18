#!/usr/bin/env bash
# Descarga el dataset de crímenes de Chicago de un año y lo guarda sin transformar en la capa raw de HDFS.
# Se corre dentro de la instancia EC2, con HDFS arriba:
#   bash ingesta-raw.sh          # 2025
#   bash ingesta-raw.sh 2022     # 2022, 2023, 2024 o 2025
# La carpeta lleva la fecha de descarga porque el portal sigue modificando los datos (reportes tardíos);
# así cada corrida del pipeline se puede reproducir con la copia exacta que usó.
set -euo pipefail

ANIO=${1:-2025}
# Cada año tiene su propio dataset en el portal, con las mismas 22 columnas
case "$ANIO" in
  2022) DATASET=9hwr-2zxp ;;
  2023) DATASET=xguy-4ndq ;;
  2024) DATASET=dqcy-ctma ;;
  2025) DATASET=t7ek-mgzi ;;
  *) echo "Año no soportado: $ANIO (usa 2022, 2023, 2024 o 2025)" >&2; exit 1 ;;
esac
URL_CSV="https://data.cityofchicago.org/api/views/$DATASET/rows.csv?accessType=DOWNLOAD"
URL_CONTEO="https://data.cityofchicago.org/resource/$DATASET.json?\$select=count(*)"
FECHA=$(date +%F)
LOCAL_DIR=$HOME/ingesta
ARCHIVO=$LOCAL_DIR/Crimes_$ANIO.csv
HDFS_DIR=/datalake/raw/crimes_$ANIO/fecha=$FECHA

export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}
export PATH=$PATH:/opt/hadoop/bin

echo "== 1. Descarga =="
mkdir -p "$LOCAL_DIR"
curl -sSL --fail -o "$ARCHIVO" "$URL_CSV"
ls -lh "$ARCHIVO"

echo "== 2. Conteo: CSV contra la API del portal =="
# Se cuenta con el módulo csv para no confundir saltos de línea dentro de un campo con registros
FILAS_CSV=$(python3 -c 'import csv, sys
with open(sys.argv[1], newline="", encoding="utf-8") as f:
    lector = csv.reader(f)
    next(lector)
    print(sum(1 for _ in lector))' "$ARCHIVO")
FILAS_API=$(curl -sSL --fail "$URL_CONTEO" | python3 -c 'import json, sys; print(list(json.load(sys.stdin)[0].values())[0])')
echo "Registros en el CSV: $FILAS_CSV"
echo "Registros en la API: $FILAS_API"
if [ "$FILAS_CSV" = "$FILAS_API" ]; then
  echo "OK: los conteos coinciden"
else
  echo "AVISO: los conteos no coinciden (el portal pudo actualizarse entre la descarga y la consulta)"
fi

echo "== 3. Subida a HDFS =="
SHA256=$(sha256sum "$ARCHIVO" | cut -d' ' -f1)
cat > "$LOCAL_DIR/_ingesta.json" <<EOF
{
  "anio": $ANIO,
  "dataset": "$DATASET",
  "url": "$URL_CSV",
  "fecha_descarga": "$FECHA",
  "filas_csv": $FILAS_CSV,
  "filas_api": $FILAS_API,
  "sha256": "$SHA256"
}
EOF
hdfs dfs -mkdir -p "$HDFS_DIR"
hdfs dfs -put -f "$ARCHIVO" "$LOCAL_DIR/_ingesta.json" "$HDFS_DIR/"
hdfs dfs -ls -h "$HDFS_DIR"

echo "Listo. En el notebook usa FECHAS_RAW[$ANIO] = \"$FECHA\""
