# Docker Compose Stacks at Home

The point of the layout is that the server is disposable: a new box, the stack
folders from git, the data from backup, and `docker compose up -d` in each
folder gets you back. Writing images and Compose for development teams is
`containers-development`; this file is about running other people's images
on one home host.

Syntax below follows the Compose Specification as implemented by
`docker compose` v2 (verified against docs.docker.com, October 2026). The
top-level `version:` key is obsolete; leave it out.

## Layout: one directory per stack

```text
/opt/stacks/                    # or ~/stacks; pick one and keep it
  README.md                     # what runs here, recovery steps, port map
  .gitignore                    # **/.env, **/data/, **/*.key
  proxy/
    compose.yaml
    .env.example
    config/
  photos/
    compose.yaml
    .env                        # real values, not committed
    .env.example                # placeholders, committed
    config/                     # bind-mounted config, committed if no secrets
    data/                       # app data; NOT in git, IS in the backup set
```

- One stack = one app and its own database/cache. Do not share one Postgres
  container between unrelated apps; upgrades then couple them.
- The folder name becomes the Compose project name, which prefixes
  containers, networks and named volumes. Renaming the folder later orphans
  named volumes; set `name:` at the top of the file if you want it fixed.
- Keep a port map in the README. Collisions are the commonest "it won't
  start" at home.

## A well-formed service

```yaml
name: photos

services:
  app:
    image: ghcr.io/example/photo-app:2.4.1       # pinned tag, never :latest
    restart: unless-stopped
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "192.168.1.10:2283:8080"                 # LAN address only
    volumes:
      - ./config:/config
      - ./data/library:/library
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    networks: [frontend, backend]

  db:
    image: postgres:16.4
    restart: unless-stopped
    environment:
      POSTGRES_USER: photos
      POSTGRES_DB: photos
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U photos -d photos"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [backend]

networks:
  frontend: {}
  backend:
    internal: true                                # no outside connectivity

secrets:
  db_password:
    file: ./secrets/db_password.txt               # chmod 600, gitignored
```

Notes on each choice:

- **Tag pinning**: a full version tag. For rollback, record the digest at
  deploy time (`references/updates-and-rollback.md`); `image: name@sha256:…`
  is valid if you want the file itself to be exact.
- **`restart`**: `unless-stopped` for long-running services (survives reboot,
  respects a manual stop). Valid values are `"no"`, `always`,
  `on-failure[:max-retries]` and `unless-stopped`.
- **`depends_on` with `condition: service_healthy`** waits for the
  dependency's healthcheck; the short list form only waits for the container
  to start, which is why apps race their databases.
- **Healthcheck test**: the tool must exist inside the image. Many minimal
  images lack `curl`/`wget`; check the project's docs for its recommended
  check, or omit rather than invent one that always fails.
- **Logging**: the `json-file` driver's `max-size` defaults to unlimited.
  Set it per service as above, or once for the host in
  `/etc/docker/daemon.json` (`"log-opts": {"max-size": "10m", "max-file": "3"}`);
  the daemon setting applies only to containers created after the daemon
  restart.
- **Secrets**: file-based secrets keep passwords out of `docker inspect`
  output. Use them where the image supports `*_FILE` variables; otherwise
  `.env` with `chmod 600`.
- **Internal network**: the database sits only on `backend`, so it is
  unreachable from the LAN and has no internet egress.

## Ports, firewalls and the reverse proxy

**Docker publishes ports by writing its own packet-filter rules, ahead of
ufw/firewalld.** A published port is reachable from the network even when
`ufw status` says it is blocked. The working patterns:

| Pattern | Use when |
|---|---|
| `"127.0.0.1:8080:80"` | Only the reverse proxy on the same host needs it |
| `"192.168.1.10:8080:80"` | LAN-only service, host has a fixed LAN address |
| No `ports:`; proxy and app share a Docker network | Cleanest: only the proxy publishes 80/443 |
| `network_mode: host` | Only when the app needs it (some discovery protocols, DLNA); it skips Docker's network isolation entirely |

A reverse proxy (Caddy, Traefik, nginx-based managers) gives one place for
TLS and authentication. For LAN-only names, use a local DNS entry (router or
Pi-hole/AdGuard Home) and either an internal CA or a real domain with DNS-01
certificates. Publishing anything to the internet is a decision for the
user, with authentication in front of the app, not a default.

Check what is actually listening from another machine, not from the host:
`nmap -p- 192.168.1.10` from a laptop on the LAN shows the truth.

## Risky settings: stop and ask

Treat these as a reason to pause and explain before deploying, especially in
a compose file copied from a forum or README (untrusted input,
`untrusted-input-handling`):

- `/var/run/docker.sock` mounted: root-equivalent on the host.
- `privileged: true`, `cap_add: [SYS_ADMIN]`, `pid: host`, `devices:` with
  broad paths.
- Bind mounts of `/`, `/etc`, `/home` or the whole data pool read-write.
- Images from an unknown publisher, or with no source repository.
- `environment:` with real credentials pasted in.

## Validating and operating

```bash
cd /opt/stacks/photos
docker compose config --quiet            # parse + validate; silent when fine
docker compose config                    # rendered file with .env substituted
docker compose --dry-run up -d           # what would be created/recreated
docker compose up -d                     # apply (after confirmation)
docker compose ps                        # state + health per service
docker compose logs --tail=100 -f app    # follow one service
docker compose down                      # stop + remove containers/networks; keeps volumes
```

`docker compose down -v` also removes named and anonymous volumes. Bind-mounted
`./data` folders survive it, named volumes do not. Treat `-v` as a delete.

Housekeeping, narrowest first, each shown and confirmed before running:

```bash
docker system df                          # what is using space (read-only)
docker image prune                        # dangling images only
docker image prune -a --filter "until=720h"   # unused images older than 30 days
```

Avoid `docker system prune --volumes` on a home server: a stopped stack's
volumes count as unused.

## Stack README checklist

- What the stack does, URL and port, which device or user relies on it.
- Data paths and whether each is in the backup set.
- Upgrade notes particular to the app (database major versions, migrations).
- How to rebuild it from scratch, and how long a restore takes.
