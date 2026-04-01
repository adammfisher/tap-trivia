variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "stage" {
  description = "Deployment stage (legacy — prefer workspace-derived local.stage)"
  type        = string
  default     = "prod"
}

# -----------------------------------------------------------------------------
# Workspace-derived locals
# default workspace = prod, dev workspace = dev
# -----------------------------------------------------------------------------
locals {
  is_dev      = terraform.workspace == "dev"
  name_prefix = local.is_dev ? "Dev-TapTrivia" : "TapTrivia"
  stage       = local.is_dev ? "dev" : "prod"
}
