#!/usr/bin/env bash
# Run ON the OCI server (has the Coolify token). Deploys cv-dashboard on Coolify.
# Prereqs: Coolify token at /root/.coolify_token, PostgREST cv key at /root/.pgrst_service_key (or pass CVKEY).
set -euo pipefail

API="http://localhost:8000/api/v1"
TOKEN="$(sudo cat /root/.coolify_token)"
CVKEY="${CVKEY:-$(sudo cat /root/.pgrst_service_key)}"
PROJECT="uds1s9ii5rnzpkwpyj1bwwef"
SERVER="j4lzqm1zohzx9ql0136k3lns"
DOMAIN="https://arx-sites.duckdns.org/candidatures"
REPO="https://github.com/benoit-sigwald/cv-dashboard"

hdr=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

echo "1) create app…"
APP=$(curl -s "${hdr[@]}" -X POST "$API/applications/public" -d "{
  \"project_uuid\":\"$PROJECT\",\"server_uuid\":\"$SERVER\",\"environment_name\":\"production\",
  \"git_repository\":\"$REPO\",\"git_branch\":\"main\",\"build_pack\":\"nixpacks\",
  \"ports_exposes\":\"3000\",\"domains\":\"$DOMAIN\",\"name\":\"cv-dashboard\"
}")
echo "$APP"
UUID=$(echo "$APP" | grep -oE '"uuid":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$UUID" ] || { echo "no uuid"; exit 1; }
echo "app uuid: $UUID"

echo "2) set env…"
curl -s "${hdr[@]}" -X POST "$API/applications/$UUID/envs" -d "{\"key\":\"SUPABASE_URL\",\"value\":\"https://arx-mcp.duckdns.org/db-cv\",\"is_preview\":false}" >/dev/null
curl -s "${hdr[@]}" -X POST "$API/applications/$UUID/envs" -d "{\"key\":\"SUPABASE_SERVICE_ROLE_KEY\",\"value\":\"$CVKEY\",\"is_preview\":false}" >/dev/null
echo "env set"

echo "3) deploy…"
curl -s "${hdr[@]}" -X POST "$API/deploy?uuid=$UUID"
echo ""
echo "Done. Once built: $DOMAIN"
echo "Add a push-to-deploy webhook for future updates (see OCI Migration/REFERENCE.md)."
