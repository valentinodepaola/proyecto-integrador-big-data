variable "region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = "bigdata"
}

variable "instance_type" {
  description = "2 vCPU / 8 GiB. Debe ser apto para el nivel gratuito."
  type        = string
  default     = "m7i-flex.large"
}

variable "volume_size_gb" {
  type    = number
  default = 30
}

variable "public_key_path" {
  type    = string
  default = "~/.ssh/bigdata.pub"
}

variable "extra_ssh_cidrs" {
  description = "IPs adicionales con acceso SSH (p. ej. compañeros), en formato x.x.x.x/32."
  type        = list(string)
  default     = []
}
