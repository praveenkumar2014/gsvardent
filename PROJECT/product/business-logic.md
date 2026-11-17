# Business Logic Baseline

## Workspace model
Every project and operational resource belongs to a workspace unless explicitly classified as platform-level. Membership is required for workspace access.

## Plan lifecycle
Draft → Validated → Awaiting approval → Approved → Executing → Review required → Completed. Plans may also be Rejected, Cancelled or Failed. State transitions are server-side and audited where security-relevant.

## Task lifecycle
Pending → Ready → Running → Awaiting review → Succeeded. Alternate terminal states: Failed, Cancelled, Blocked. Retries create attempt history; they do not erase prior outcomes.

## Execution safeguards
Each run has a budget, timeout, allowed tools, filesystem scope, network policy and actor identity. Escalation requires approval and fresh authorization. Model output cannot change these limits.

## Billing/cost
No charging model is assumed. Any future credit or subscription design requires separate pricing, consent, ledger, reconciliation and refund specifications.
