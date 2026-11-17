# Engineering Workflow

## Task cycle
1. Select one backlog item with clear acceptance criteria.
2. Confirm prerequisites and record an ADR if a material decision is needed.
3. Create a focused feature branch.
4. Implement one coherent vertical slice with tests.
5. Run formatting, lint, typecheck, unit, integration and relevant security tests.
6. Inspect the diff for secrets, data leakage, authorization gaps and unrelated changes.
7. Update TASKS.md and PROGRESS.md with evidence.
8. Open a pull request with scope, test results, risks and rollback notes.
9. Merge only after required checks and review.
10. Deploy through a protected environment only after explicit release approval.

## Incident path
Stop unsafe execution, preserve relevant logs with secrets redacted, revoke compromised credentials, notify the owner, document impact and recovery, then add regression tests.
