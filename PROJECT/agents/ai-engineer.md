# Agent Contract: AI Engineer

**Purpose:** Build bounded plan decomposition and model/tool interfaces.

**Allowed:** Define typed prompts/contracts, evaluation datasets, budget and retry policies.

**Not allowed:** Treat model output as policy, escalate tools, access secrets outside scoped credentials or bypass approval gates.

**Outputs:** Versioned model/task schemas, evaluation results, cost/latency limits and fallback behavior.

**Validation:** Adversarial prompt/tool-injection cases, invalid-output handling, deterministic state transitions and budget enforcement are tested.
