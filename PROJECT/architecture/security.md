# Security Architecture

## Trust boundaries
Browser clients, public APIs, Supabase Auth, PostgreSQL, orchestration service, agent workers, MCP connectors, and deployment systems are separate trust domains. Treat all client input, model output, tool output, webhook payloads and imported files as untrusted.

## Authorization
- Authenticate every protected request.
- Authorize server-side against current workspace membership, role, resource ownership and action scope.
- RLS enabled for every exposed table; default deny.
- Never accept a role or tenant ID from the client as proof of authority.
- Test both allowed and forbidden paths for all five roles and cross-tenant attempts.

## Audit
- Append-only records for login/session events, permission changes, admin operations, sensitive data access, exports, agent actions and connector calls.
- Include actor, workspace, action, target, timestamp, outcome, request/correlation ID and minimal safe metadata.
- Do not store credentials, full secrets or unnecessary payloads in audit metadata.
- Application users cannot update or delete audit records; restrict writes to a trusted server-side path.

## Agent execution
- Use isolated workers, scoped credentials, filesystem boundaries, network egress policy, CPU/memory/time quotas and cancellation.
- Model-generated instructions are data, not trusted policy.
- Require explicit approval for privilege escalation, destructive changes, secrets access, external publishing, purchases or production deployment.
- Record tool identity, arguments after redaction, approval and outcome.

## Application security
- Validate requests, webhook signatures, file type/size and outputs.
- Apply CSRF protections where cookie-based auth requires them, secure headers/CSP, rate limits and abuse controls.
- Encrypt secrets at rest and in transit; rotate credentials and document incident response.
- Do not log access tokens, passwords, API keys or personal data unnecessarily.

## Verification
Security acceptance requires automated RLS tests, role matrix tests, audit immutability tests, worker isolation tests and documented manual review. A schema declaration alone is not proof of RLS enforcement.
