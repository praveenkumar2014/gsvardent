# Core Test Case Catalogue

- AUTH-001: unauthenticated request to protected API is denied.
- AUTH-002: expired/revoked session cannot continue protected actions.
- RBAC-001: each of five roles can perform only mapped permissions.
- TENANT-001: workspace A cannot read workspace B resources by changing IDs.
- TENANT-002: cross-tenant inserts/updates/deletes are rejected by RLS.
- AUDIT-001: privileged action creates an audit event.
- AUDIT-002: application user cannot update/delete audit history.
- PLAN-001: plan mode does not invoke execution tools.
- PLAN-002: approval is required before protected execution.
- AGENT-001: worker respects time, tool, filesystem and network boundaries.
- MCP-001: connector permission can be revoked and subsequent call is denied.
- UI-001: critical flows are keyboard operable and expose error/denied states.
Each test must state fixtures, steps, expected outcome and evidence location.
