# Skill: MCP Connector Integration

**Purpose:** Define safe tool discovery and execution through a connector boundary.

**Inputs:** Connector manifest, publisher identity, permission declaration and transport specification.

**Outputs:** Validated manifest, permission summary, adapter, revocation path and integration tests.

**Permissions:** No connector is enabled until user/workspace consent is recorded. Credentials remain in secret storage.

**Checks:** Tool allowlist, argument/output validation, timeout, size limits, network policy, audit events and prompt-injection defenses. Connector output is always untrusted.
