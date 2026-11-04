# Proyecto integrador de tecnologías de Big Data

Predicción de delitos en Chicago: dónde, cuándo y qué tipo de delito es más probable, a partir de los datos abiertos del Departamento de Policía de Chicago.

**Equipo:** Carlos David Gonzalez Davila · Valentino De Paola Gallardo · Eduardo Lopez Uresti

**Vista general del proyecto** (arquitectura, datos, resultados, decisiones y próximos pasos): [docs/Documentacion-General.md](docs/Documentacion-General.md)

## Fases

| Fase | Contenido | Estado | Documento |
|---|---|---|---|
| 2 | Plan CRISP-DM y arquitectura objetivo | Terminada | [Google Doc](https://docs.google.com/document/d/1j1llfIa9vETELeaJd5Plgcu2zRa5RBDYazHdIkCQM-Q/edit) |
| 3 | Pipeline y modelado con PySpark: preparación de datos, 2 modelos de SparkML y 5 visualizaciones | Terminada | [docs/Fase3-Plan-y-Alcance.md](docs/Fase3-Plan-y-Alcance.md) |
| 4 | Resultados e impacto de negocio | Por arrancar | — |

## Estructura

```
docs/        Documentación general, planes de cada fase y guía de operación
infra/       Terraform: instancia EC2 en AWS (Hadoop + Spark)
scripts/     Instalación de Hadoop/Spark e ingesta de datos
notebooks/   Notebook del pipeline (A, B y C) y plantilla para prototipar en local
evidencia/   Capturas por tipo para el reporte (índice en evidencia/README.md)
```

## Infraestructura

Una instancia EC2 en AWS (`us-east-1`) creada con Terraform, con Hadoop (HDFS + YARN), Spark y PySpark.

- Cómo encenderla, detenerla y conectarse: [docs/Guia-Instancia-AWS.md](docs/Guia-Instancia-AWS.md)
- El estado de Terraform y las credenciales de AWS **no** se suben al repo.
- Los datos tampoco: se descargan con scripts y se guardan en HDFS.
