output "dynamodb_table_name" {
  description = "The name of the DynamoDB table"
  value       = aws_dynamodb_table.enquiries.name
}

output "dynamodb_table_arn" {
  description = "The ARN of the DynamoDB table"
  value       = aws_dynamodb_table.enquiries.arn
}

output "aws_access_key_id" {
  description = "The AWS access key ID for the backend user"
  value       = aws_iam_access_key.backend_user_keys.id
}

output "aws_secret_access_key" {
  description = "The AWS secret access key for the backend user"
  value       = aws_iam_access_key.backend_user_keys.secret
  sensitive   = true
}
