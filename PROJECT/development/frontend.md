# Frontend Engineering Guide

- Use strict TypeScript and explicit public contracts.
- Keep presentation separate from domain rules and orchestration.
- Validate form/API payloads with Zod contracts.
- Never treat client state, navigation visibility or JWT display claims as authorization.
- Fetch protected data through authenticated APIs and render only returned permissions.
- Include loading, empty, error, denied and success states.
- Use semantic HTML, keyboard-accessible interaction and reduced-motion support.
- Never include service-role keys or privileged credentials in browser bundles.
- Test critical flows, permission states and responsive layouts.
