# Skill: Database Management

**Purpose:** Maintain schema, migrations, query performance and RLS correctness.

**Inputs:** Approved data model, access matrix and migration conventions.

**Outputs:** Versioned SQL migrations, indexes, constraints, RLS policies and policy tests.

**Permissions:** Development/test database only. Production changes require explicit human approval and rollback plan.

**Checks:** RLS on every exposed table, deny-by-default, cross-tenant isolation, migration reproducibility, backup/restore and audit-log immutability.
