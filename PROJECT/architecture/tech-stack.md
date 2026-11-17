# Technology Stack Decision Record

## Selected application foundation
- Next.js 16 App Router.
- React 19.
- Strict TypeScript.
- npm package manager and committed lockfile required for release reproducibility.
- Zod runtime validation.
- Supabase Auth and PostgreSQL.
- `@supabase/ssr` cookie-based sessions and `@supabase/supabase-js` data access.
- GitHub Actions for CI.

## Current package pins
- next 16.4.6
- react / react-dom 19.3.1
- @supabase/ssr 0.12.7
- @supabase/supabase-js 2.119.0
- zod 4.6.7

Versions were checked against current npm package listings during the app scaffold work. Review dependency advisories and commit a package-lock before a production release.

## Still to be selected
- Worker isolation/sandbox runtime and queue.
- Artifact/object storage and retention.
- Model providers and budget governance.
- MCP connector hosting/trust validation.
- Observability and error tracking provider.
- Production hosting, domain mapping and rollback.

Choose remaining services based on threat model, operational cost, data control and portability. Do not assume a live provider is configured.
