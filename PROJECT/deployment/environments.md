# Environment Strategy

## Environments
- Local/test: synthetic data, isolated database, no production credentials.
- Preview: per-PR or shared non-production deployment, limited external access.
- Staging: production-like configuration with synthetic or sanitized data.
- Production: protected, audited, least-privilege deployment only.

## Configuration
Document variable name, purpose, environment, sensitivity, owner and rotation process. Store values in secret management, not in Git. Validate required variables at startup and fail safely.

Keep Supabase projects, OAuth clients, storage buckets, webhook secrets and model credentials separated by environment. Access to production must be restricted and reviewed.
