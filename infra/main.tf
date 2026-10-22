# Ubuntu Server 24.04 LTS (x86_64) oficial de Canonical
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

data "aws_vpc" "default" {
  default = true
}

# IP pública actual; si cambia, basta con volver a correr terraform apply
data "http" "my_ip" {
  url = "https://checkip.amazonaws.com"
}

locals {
  ssh_cidrs = concat(["${chomp(data.http.my_ip.response_body)}/32"], var.extra_ssh_cidrs)
}

resource "aws_key_pair" "bigdata" {
  key_name   = "bigdata-key"
  public_key = file(pathexpand(var.public_key_path))
}

# Solo SSH. Las UIs de Hadoop/YARN/Jupyter se ven por túnel SSH, sin abrir puertos.
resource "aws_security_group" "hadoop" {
  name        = "hadoop-bigdata-sg"
  description = "SSH solo desde IPs del equipo"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = local.ssh_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "hadoop" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.bigdata.key_name
  vpc_security_group_ids = [aws_security_group.hadoop.id]

  root_block_device {
    volume_size = var.volume_size_gb
    volume_type = "gp3"
  }

  metadata_options {
    http_tokens = "required"
  }

  tags = {
    Name = "hadoop-bigdata"
  }
}
