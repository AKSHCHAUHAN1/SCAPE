terraform {
  backend "s3" {
    bucket         = "scape-tf-state"
    key            = "global/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "scape-tf-locks"
    encrypt        = true
  }
}
