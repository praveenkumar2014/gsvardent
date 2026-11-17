# Acceptance Testing Protocol

1. Select the story and its acceptance criteria.
2. Prepare isolated test workspace, role fixtures and synthetic data.
3. Execute the happy path and all explicit denied/negative cases.
4. Verify server response and database/RLS behavior independently.
5. Confirm audit entries for privileged actions.
6. Verify UI feedback, keyboard access and responsive behavior.
7. Capture commit SHA, workflow run, test output and defect links.
8. Mark accepted only when all mandatory criteria pass.

A screenshot or a successful page load alone is not acceptance evidence for authorization, RLS, audit immutability or execution isolation.
