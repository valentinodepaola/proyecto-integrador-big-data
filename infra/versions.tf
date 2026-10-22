terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.4"
    }
  }
}

# Perfil "bigdata" = cuenta personal del proyecto. Nunca usar "default" (es de otra cuenta).
provider "aws" {
  region  = var.region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project = "ProyectoBigData"
      Fase    = "3"
    }
  }
}
