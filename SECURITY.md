# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SCAPE, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainers directly at: **[security contact TBD]**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgement**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix**: Depending on severity, within 1–4 weeks

## Security Practices

SCAPE follows these security practices:

### Authentication & Authorization
- JWT (RS256) with short-lived access tokens (15 min) and refresh tokens (7 day)
- Role-based access control (Developer, Team Lead, DevOps, Admin)
- Resource-level ownership checks (team-scoped)

### Secrets Management
- No secrets in source code or environment variables shipped to the browser
- AWS credentials via STS AssumeRole (short-lived, scoped)
- GitHub App authentication (no personal access tokens)
- All secrets stored in AWS Secrets Manager

### Infrastructure
- TLS everywhere
- Network policies enforced
- IAM least-privilege roles
- Terraform state encrypted at rest (S3 SSE)

### Application
- Input validation on all API endpoints (Zod)
- Parameterized database queries (SQL injection prevention)
- Rate limiting (100 req/min per user)
- CORS restricted to allowed origins
- CSRF protection via SameSite cookies
- Content-Security-Policy headers
- HMAC-SHA256 webhook signature verification

### Audit
- Immutable audit log for all provisioning and deployment events
- Structured JSON logging with correlation IDs
- AWS CloudTrail enabled
