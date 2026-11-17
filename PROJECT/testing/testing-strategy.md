# Testing Strategy

## Required layers
- Unit: domain services, validators, state machines and permission decisions.
- Integration: API/database transactions, auth/session handling, audit writes and connector proxy.
- RLS: positive and negative access tests for each table, role and tenant boundary.
- Contract: Zod schemas and API/webhook/agent-envelope compatibility.
- End-to-end: sign-in, onboarding, project creation, plan approval, execution review and administration.
- Security: IDOR, privilege escalation, secret leakage, CSRF as applicable, prompt/tool injection, SSRF, path traversal and worker escape.
- Accessibility: keyboard paths, focus management, labels, contrast and screen-reader landmarks.
- Performance: key page load, task feed, database query and worker quota baselines.

## Quality gate
A test must verify observable behavior, not implementation detail alone. Negative authorization tests are mandatory. Never mark security complete based only on static configuration.
