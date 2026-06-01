terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB Table
resource "aws_dynamodb_table" "enquiries" {
  name         = "${var.table_name}-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "enquiryId"

  attribute {
    name = "enquiryId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = var.environment
    Project     = "mywebsite"
    ManagedBy   = "Terraform"
  }
}

# IAM User for the Backend Service
resource "aws_iam_user" "backend_user" {
  name = "enquiry-backend-user-${var.environment}"
  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# IAM Policy for DynamoDB Write Access
resource "aws_iam_policy" "dynamodb_write_policy" {
  name        = "enquiry-dynamodb-write-policy-${var.environment}"
  description = "Allows write-only access to the Enquiries DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem"
        ]
        Resource = aws_dynamodb_table.enquiries.arn
      }
    ]
  })
}

# Attach Policy to User
resource "aws_iam_user_policy_attachment" "user_policy_attach" {
  user       = aws_iam_user.backend_user.name
  policy_arn = aws_iam_policy.dynamodb_write_policy.arn
}

# Create Access Keys for the User
resource "aws_iam_access_key" "backend_user_keys" {
  user = aws_iam_user.backend_user.name
}
