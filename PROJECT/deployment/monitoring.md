# Monitoring and Observability

## Signals
- Availability and latency by endpoint.
- Authentication and authorization failures.
- RLS/policy denial trends without exposing row contents.
- Task queue depth, worker duration, retries and cancellations.
- Model/tool usage and cost against budgets.
- Error rate, build/deploy state and health checks.
- Audit write failures and ingestion lag.

## Practices
Use correlation IDs across API/orchestrator/worker. Redact secrets and minimize personal data. Define alerts with owner, severity and response runbook. Retain logs according to documented policy. Do not claim an uptime target until service-level measurement and operational coverage exist.
