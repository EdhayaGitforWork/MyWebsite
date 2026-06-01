variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-west-2" # London
}

variable "environment" {
  description = "Environment name (e.g. dev, prod)"
  type        = string
  default     = "dev"
}

variable "table_name" {
  description = "The base name of the DynamoDB table"
  type        = string
  default     = "Enquiries"
}
