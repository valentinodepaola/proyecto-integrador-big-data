# Proyecto integrador de tecnologías de Big Data

Predicción de delitos en Chicago: dónde, cuándo y qué tipo de delito es más probable, a partir de los datos abiertos del Departamento de Policía de Chicago.

**Equipo:** Carlos David Gonzalez Davila · Valentino De Paola Gallardo · Eduardo Lopez Uresti

## Fases

| Fase | Contenido | Documento |
|---|---|---|
| 2 | Plan CRISP-DM y arquitectura objetivo | [Google Doc](https://docs.google.com/document/d/1j1llfIa9vETELeaJd5Plgcu2zRa5RBDYazHdIkCQM-Q/edit) |
| 3 | Infraestructura Big Data y análisis de cinco hipótesis | [docs/Fase3-Plan-y-Alcance.md](docs/Fase3-Plan-y-Alcance.md) |

## Estructura

```
docs/        Planes de cada fase y guías de operación
infra/       Terraform: instancia EC2 en AWS (Hadoop + Spark)
scripts/     Instalación de Hadoop/Spark e ingesta de datos
notebooks/   Análisis en PySpark (uno por hipótesis)
evidencia/   Capturas para el reporte
```

## Infraestructura

Una instancia EC2 en AWS (`us-east-1`) creada con Terraform, con Hadoop (HDFS + YARN), Spark y PySpark.

- Cómo encenderla, detenerla y conectarse: [docs/Guia-Instancia-AWS.md](docs/Guia-Instancia-AWS.md)
- El estado de Terraform y las credenciales de AWS **no** se suben al repo.
- Los datos tampoco: se descargan con scripts y se guardan en HDFS.
