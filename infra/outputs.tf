output "instance_id" {
  value = aws_instance.hadoop.id
}

output "public_ip" {
  value = aws_instance.hadoop.public_ip
}

output "ssh_command" {
  value = "ssh -i ~/.ssh/bigdata ubuntu@${aws_instance.hadoop.public_ip}"
}

output "ssh_allowed_from" {
  value = local.ssh_cidrs
}
