# Static Frontend Module
#
# Provisions a static website hosting stack on AWS:
# - S3 bucket (website hosting, restricted public access)
# - CloudFront distribution (CDN, HTTPS)
# - ACM certificate (TLS)
# - Origin Access Identity
#
# This module is invoked by the SCAPE provisioning engine.
# See terraform/README.md for the variable/output contract.
