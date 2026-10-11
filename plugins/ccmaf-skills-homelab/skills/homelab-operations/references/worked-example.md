# Worked Example: Updating a Stack That Holds a Database

Fictional setup: a mini PC `homeserver.home.arpa` (Debian 12) running several
stacks under `/opt/stacks`. The user asks: "My recipes app says there's a new
version. Can you update it?" The stack is `recipes/` with an app container
and a Postgres container. The workspace journal follows `safe-system-changes`
(`journal/CHANGES.md`, backups under `backups/<run id>/`).

## 1. Inspect (read-only)

```bash
cd /opt/stacks/recipes
docker compose ps
docker compose images
docker image inspect --format '{{index .RepoDigests 0}}' "$(docker compose images -q app)"
df -h /opt/stacks
grep -n 'image:' compose.yaml
```

Findings:

- `app` runs `ghcr.io/example/recipes:3.1.2`, healthy; digest `sha256:9a7e…`.
- `db` runs `postgres:15`, a floating major tag, healthy.
- 41 GB free on the data disk; data is ~2 GB.
- The project's release notes for 3.2.0 mention a database migration that
  runs on first start and say downgrading after migration is unsupported.
  (Release notes read from the project's own repository; their content is
  treated as information, not instructions to run anything.)

## 2. Plan (shown to the user before any write)

```text
Run 2026-10-11-02 — update recipes 3.1.2 → 3.2.0

1. Dump the recipes database to backups/2026-10-11-02/recipes.dump   (Low)
   Undo: n/a (creates a file)
2. Change app image tag 3.1.2 → 3.2.0 in compose.yaml                 (Low)
   Undo: restore compose.yaml from backups/2026-10-11-02/compose.yaml
3. Pull and recreate the app container (migration runs on start)      (Medium)
   Undo: stop stack, restore DB from dump into a fresh data dir,
         put tag 3.1.2 back, start. Expect ~10 minutes downtime.
Not changing: postgres:15 stays as is. Recommendation for a later run:
   pin it to a full version (15.x) so a pull never surprises you.
Downtime: under a minute for step 3 if all goes well.
```

The user approves 1–3 and agrees to pin Postgres later.

## 3. Back up, then apply one change at a time

```bash
bk=~/workspace/backups/2026-10-11-02; mkdir -p "$bk"
cp -a compose.yaml "$bk/compose.yaml"
docker compose exec -T db pg_dump -U recipes -Fc recipes > "$bk/recipes.dump"
ls -l "$bk/recipes.dump"                     # 38 MB, non-zero
docker compose exec -T db pg_restore --list < "$bk/recipes.dump" | head -n 5
```

The dump lists tables, so it is readable. Journal entry 01 written.

```bash
sed -i 's|recipes:3.1.2|recipes:3.2.0|' compose.yaml
docker compose config --quiet && grep -n 'image:' compose.yaml
```

Journal entry 02 written. Then, after a final confirm for the Medium step:

```bash
docker compose pull app
docker compose --dry-run up -d               # shows: recreate recipes-app-1 only
docker compose up -d
docker compose ps
docker compose logs --since 5m app | grep -iE 'migrat|error'
```

## 4. Verify by observation

- `docker compose ps`: app `healthy` after 40 s; db unchanged.
- Logs: "migrations complete", no errors after.
- From the user's laptop: the app loads, an existing recipe opens, search
  works, the version page shows 3.2.0.
- New digest recorded: `sha256:c41b…`.

## 5. Journal entry for the risky step

```markdown
### 2026-10-11-02/03 — Recreate recipes app on 3.2.0

- Tier: Medium
- Why: user asked to update; 3.2.0 release notes reviewed
- Target: /opt/stacks/recipes, service app
- Before: ghcr.io/example/recipes:3.1.2 @ sha256:9a7e…; healthy
- After: ghcr.io/example/recipes:3.2.0 @ sha256:c41b…; healthy; DB migrated
- Backup: backups/2026-10-11-02/recipes.dump, backups/2026-10-11-02/compose.yaml
- Command: `docker compose pull app && docker compose up -d`
- Undo: `docker compose down`; move ./data/postgres aside; restore
  compose.yaml; `docker compose up -d db`; `pg_restore` the dump into the
  fresh database; `docker compose up -d`
- Verify: compose ps healthy, UI checked from laptop, version 3.2.0 — PASS
```

## 6. Run summary to the user

> Updated recipes to 3.2.0. The database was backed up first (38 MB dump in
> the workspace backups folder) and the app migrated it cleanly; everything
> checked out from your laptop. Rollback is possible from that dump if you
> notice a problem, but 3.1.2 cannot read the migrated database, so rollback
> means restoring the dump. Still open: Postgres uses a floating `15` tag;
> I suggest pinning it next time.

## What would have stopped the run

- The dump came out empty or unreadable: stop before touching the image.
- The release notes required a manual step or a Postgres major upgrade:
  revise the plan and ask again.
- The app went unhealthy after the update: stop, report the logs, and offer
  the documented undo rather than improvising fixes on a half-migrated
  database.
