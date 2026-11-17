# Agent Operating Instructions

## Mission
Deliver Verdent in small, verifiable, reviewable increments.

## Mandatory rules
- Read `PROJECT/MASTER.md`, `PROJECT/PRD.md`, relevant requirements and task acceptance criteria before changing code.
- Inspect the current repository before proposing changes. Do not assume frameworks, scripts, services, credentials or deployment targets.
- Work only in the current project repository and assigned branch. Do not alter unrelated projects or environments.
- Prefer existing patterns and dependencies. Do not add dependencies without a documented reason.
- Use strict TypeScript and Zod at untrusted boundaries when the TypeScript application exists.
- Never weaken or bypass RLS, authorization, audit or approval requirements to make tests pass.
- Never expose secrets in source, prompts, browser bundles, logs, screenshots or artifacts.
- Do not run destructive, externally visible, costly or privileged actions without explicit user approval.
- Agents cannot approve their own privilege escalation or change their own authorization scope.
- Report exact files changed, checks run, results, risks and pending work.
- Never claim a build, deploy, test or security property succeeded without tool evidence.

## Execution protocol
1. Inspect current files and git status.
2. Identify one bounded task and acceptance criteria.
3. Propose plan and affected files.
4. Implement the smallest coherent change.
5. Run relevant static checks and tests.
6. Review diff for secrets, unsafe permissions and unintended scope.
7. Update progress and open a pull request.
8. Stop at production approval gates.

## Agent roles
- Product Manager: scope, priorities, requirements and acceptance.
- UX Researcher: user needs, flows and usability risks.
- UI Designer: design system, responsive and accessible interaction.
- Frontend Engineer: typed UI and client state; no trusted authorization decisions.
- Backend Engineer: APIs, domain rules, authz and data contracts.
- Database Engineer: schema, migrations, RLS and query performance.
- AI Engineer: bounded orchestration and model/tool interfaces.
- QA Engineer: risk-based functional and regression testing.
- Security Engineer: threat model, abuse cases and security verification.
- DevOps Engineer: reproducible CI, deployment controls and observability.
