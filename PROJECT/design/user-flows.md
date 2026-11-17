# Critical User Flows

## Create a project
Authenticate → select/create workspace → confirm membership → create project → land on project overview.

## Plan before execute
Compose goal → validate input → generate proposed plan → show tasks, assumptions, permissions and estimated resources → edit/reject/approve.

## Execute and review
Approved plan → authorize bounded task → run isolated worker → stream status → persist artifacts → show diff/results → user accepts, requests revision or cancels.

## Manage membership
Admin re-authenticates where required → selects member → chooses role → backend validates authority → transaction writes membership and audit event → notify affected member.

## Enable connector
Inspect publisher, version and permission manifest → approve exact scopes → bind secrets through secure flow → test connection → enable → allow revoke at any time.
