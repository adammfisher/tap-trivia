variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "stage" {
  description = "Deployment stage"
  type        = string
  default     = "prod"
}
