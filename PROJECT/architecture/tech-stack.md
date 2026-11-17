# Technology Stack Decision Record

## Confirmed direction
- TypeScript with strict compiler settings.
- Zod for runtime validation.
- Supabase Auth and PostgreSQL as the intended identity/data platform.
- GitHub Actions for repository automation.

## Candidates, not yet selected
- React/Next.js for web experience.
- Tailwind CSS and an accessible component system.
- Dedicated API/domain service and isolated execution workers.
- Object storage for artifacts.
- Queue/event infrastructure for task orchestration.

## Selection criteria
Security model, operational complexity, cost predictability, ecosystem maturity, deployability, local/test reproducibility, data residency and vendor portability. Do not pin package versions or claim selected services until repository implementation and hosting constraints are verified.
