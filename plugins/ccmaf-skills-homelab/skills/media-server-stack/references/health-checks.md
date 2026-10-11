# Health checks (read-only)

Everything on this page reads; nothing changes the stack. Run it at the
start of any diagnosis, and use the status script for a scheduled report
(scheduling and run logs follow `scheduled-run-discipline`).

Never print API keys into chat or logs. Read them into a shell variable
from the app's config or `.env`, and refer to them as `<sonarr-api-key>` in
anything written down.

## Inventory

```bash
docker compose ps                        # state and health per service
docker compose config --images           # images and tags actually in use
docker compose logs --since 1h sonarr    # recent log lines for one service
docker inspect -f '{{json .Mounts}}' sonarr   # real mounts, as Docker sees them
docker compose exec sonarr id            # the uid/gid the app runs as
df -h /srv/data                          # free space on the data root
```

Then build or update the path map (`architecture-and-layout.md`) from what
these commands report, not from what the compose file was meant to do.

## Paths and permissions

```bash
# Do the containers see the same files at the same path?
docker compose exec sonarr      ls -ld /data/torrents/tv /data/media/tv
docker compose exec qbittorrent ls -ld /data/torrents/tv

# Same filesystem? (same device number means hardlinks are possible)
stat -c '%d %n' /srv/data/torrents /srv/data/media

# Anything not owned by the media user? (count first, list a sample)
find /srv/data/media ! -user 1000 | wc -l
find /srv/data/media ! -user 1000 | head -20
```

## Health endpoints

The *arr apps expose a health list (the same warnings shown in System,
Status) and a status endpoint. Pass the key in the `X-Api-Key` header, not
in the URL, so it does not land in proxy or shell history logs.

```bash
# Path is an example: the config.xml inside Sonarr's /config volume.
SONARR_KEY="$(grep -oP '(?<=<ApiKey>)[^<]+' /opt/stacks/sonarr/config/config.xml)"
curl -fsS -H "X-Api-Key: $SONARR_KEY" http://localhost:8989/api/v3/system/status
curl -fsS -H "X-Api-Key: $SONARR_KEY" http://localhost:8989/api/v3/health
```

| App | Status | Health list |
|---|---|---|
| Sonarr, Radarr | `/api/v3/system/status` | `/api/v3/health` |
| Lidarr, Prowlarr | `/api/v1/system/status` | `/api/v1/health` |
| Jellyfin | `/System/Info/Public` (no auth) | `/health` returns 200 when HTTP and database are up |
| Plex | `/identity` (no auth, XML) | Dashboard and logs; no public health list |
| qBittorrent | `/api/v2/app/version` (needs a login session unless localhost bypass is on) | |

The API versions above are as of Sonarr v4 and Radarr v5 (verify against
the app's own API docs for the version in front of you). The *arr apps also
answer an unauthenticated `/ping` in recent versions (verify), useful for a
Compose healthcheck.

Jellyfin's `/health` does not work during start-up while database
migrations run; give any healthcheck a generous start period so a
watchdog does not restart it mid-migration.

## Status script

A read-only summary suitable for a daily report. It prints health messages
and free space; it never restarts or fixes anything.

```bash
#!/usr/bin/env bash
set -euo pipefail
# Reads keys from env vars (set from .env); never echoes them.
check_arr() {  # name port apiver keyvar
  local name=$1 port=$2 ver=$3 key=${!4:-}
  if [[ -z $key ]]; then echo "$name: SKIPPED (no key)"; return; fi
  if out=$(curl -fsS --max-time 10 -H "X-Api-Key: $key" \
        "http://localhost:$port/api/$ver/health"); then
    n=$(jq length <<<"$out")
    echo "$name: OK ($n health messages)"
    jq -r '.[] | "  - [\(.type)] \(.message)"' <<<"$out"
  else
    echo "$name: UNREACHABLE"
  fi
}
check_arr sonarr 8989 v3 SONARR_KEY
check_arr radarr 7878 v3 RADARR_KEY
check_arr prowlarr 9696 v1 PROWLARR_KEY
if curl -fsS --max-time 10 -o /dev/null http://localhost:8096/health; then
  echo "jellyfin: OK"
else
  echo "jellyfin: UNHEALTHY"
fi
df -h --output=target,pcent,avail /srv/data | tail -n +2 \
  | awk '{print "data root: " $2 " used, " $3 " free"}'
```

Shell scripting standards (quoting, strict mode, ShellCheck) are owned by
`bash-development`. Adjust ports and API versions to the path map.

## Reading the health list

| Message theme | Usually means | Next step |
|---|---|---|
| Download client unavailable | Wrong host (often `localhost`), wrong port, client down, VPN container down | `common-failures.md`, "Connectivity" |
| Remote path / path does not exist | Mount mismatch between manager and client | Compare both containers' `ls` of the reported path |
| Root folder missing or not writable | Mount missing, permissions, disk not mounted on host | `stat` the host path; check `id` in the container |
| Indexer unavailable | An indexer the user configured is failing | Report it; do not suggest replacements |
| Update available / branch | Informational | Updates follow `homelab-operations` |
| Disk space | Data root or config disk low | Report; never free space by deleting media unasked |
