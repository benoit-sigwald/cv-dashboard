# cv-dashboard

Live view of `cv_applications` (OCI PostgREST `db-cv`) — refresh button, **Rému column first**, sortable, status badges.

The **service key stays server-side** (env var). The browser only calls `/api/applications`; the key is never exposed.

## Env (set in Coolify)
| Var | Value |
|---|---|
| `SUPABASE_URL` | `https://arx-mcp.duckdns.org/db-cv` |
| `SUPABASE_SERVICE_ROLE_KEY` | the `cv_writer` / read token |
| `PORT` | `3000` (Coolify default) |

## Run locally
```bash
SUPABASE_URL=https://arx-mcp.duckdns.org/db-cv SUPABASE_SERVICE_ROLE_KEY=<key> node server.js
# http://localhost:3000
```

## Deploy on OCI / Coolify (subpath, Option A)
Runtime: nixpacks (Node), start `node server.js`, port 3000. Prefix-aware via `<base href="./">` + relative `api/applications`.

1. `POST /api/v1/applications/public` — project/server uuid, `git_repository=https://github.com/benoit-sigwald/cv-dashboard`, `git_branch=main`, `build_pack=nixpacks`, `ports_exposes=3000`, `domains=https://arx-sites.duckdns.org/candidatures`.
2. `POST /api/v1/applications/{uuid}/envs` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. `POST /api/v1/deploy?uuid={uuid}` then poll.
4. Add a GitHub push-to-deploy webhook (see OCI Migration/REFERENCE.md).

No DB writes — read-only.
