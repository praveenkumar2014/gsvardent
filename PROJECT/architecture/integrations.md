# Integration Architecture

Identity providers, Git providers, model providers, MCP tools, artifact storage, telemetry and deployment systems are separate trust boundaries. Connections require explicit consent and least-privilege scopes. Store OAuth tokens and API credentials server-side in secret management; never in browser storage or connector metadata.

Verify webhook signatures and replay protection. Use worker egress allowlists, DNS/IP validation, timeouts and response limits to mitigate SSRF. Record provider, connector version, granted scopes, health and last use. Support disconnect, token revocation and data deletion. Treat remote pages, repository content, model output and tool responses as untrusted data. No provider is active until a connection is explicitly configured and tested.
