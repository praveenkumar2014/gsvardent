# Release Readiness Checklist

- [ ] Product scope and acceptance criteria approved.
- [ ] Architecture decisions recorded.
- [ ] Strict TypeScript, Zod boundary validation and lint pass.
- [ ] Supabase migrations reviewed and reproducible.
- [ ] RLS enabled for all exposed tables and policy tests pass.
- [ ] Five-tier RBAC tests pass, including denied and cross-tenant cases.
- [ ] Audit events cover all privileged actions and are append-only.
- [ ] Agent workers are isolated, bounded, cancellable and auditable.
- [ ] MCP/skills permissions are inspectable and revocable.
- [ ] Unit, integration, E2E, accessibility and security checks pass.
- [ ] Secrets, backup, restore and rollback procedures verified.
- [ ] Hosting target and protected production environment configured.
- [ ] Deployment approval and post-deploy smoke tests complete.
