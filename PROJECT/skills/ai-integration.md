# Skill: AI Integration

**Purpose:** Integrate model inference into typed, bounded product workflows.

**Inputs:** Task contract, provider constraints, safety requirements and budget.

**Outputs:** Model adapter, validated response schema, evaluation fixtures, usage/cost metrics and fallback behavior.

**Permissions:** Approved provider endpoint and non-production credentials only.

**Checks:** Treat model responses as untrusted; validate output; resist prompt injection; enforce timeout, retries and spend ceilings; redact sensitive data; require approval for consequential actions.
