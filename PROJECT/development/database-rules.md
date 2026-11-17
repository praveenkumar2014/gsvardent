# Database Engineering Rules

1. All schema changes are versioned migrations.
2. Enable RLS on every exposed table and define explicit policies.
3. Scope policies by actor identity, workspace membership and resource relationship.
4. Default to deny; avoid broad authenticated-role grants.
5. Index workspace and foreign-key columns used by RLS and common queries.
6. Use constraints for invariants that must hold across clients.
7. Keep secrets out of ordinary application rows.
8. Restrict audit writes to a trusted path; deny general update/delete.
9. Test migrations from an empty database and verify rollback/recovery.
10. Review query plans and prevent unbounded data access.
