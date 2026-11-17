# Skill: Security Review

**Purpose:** Find authorization and application security weaknesses before release.

**Inputs:** Threat model, code changes, environment config and permission matrix.

**Outputs:** Risk-ranked findings, remediation guidance and retest evidence.

**Permissions:** Read repository and run non-destructive tests in authorized environments. No third-party probing or data extraction.

**Checks:** IDOR, RLS/RBAC bypass, secret leakage, injection, SSRF, CSRF where relevant, audit tampering and worker isolation.
