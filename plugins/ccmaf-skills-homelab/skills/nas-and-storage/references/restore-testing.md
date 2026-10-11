# Restore Testing

A backup is a claim; a restore is the evidence. Restore tests find the
problems that green backup jobs hide: a path that was never included, a
database dump that is empty, a password nobody can find, a restore that
takes three days over the home connection.

Restore tests write only into a scratch location. **Never restore over live
data as a test**, and never point a test restore at the original path. A
real restore over live data is a change under `safe-system-changes`: back up
the current state first, even if it is damaged.

## Three levels

| Level | What | How often |
|---|---|---|
| Integrity check | The tool verifies its own repository (`restic check`, `borg check`, a ZFS scrub on the backup pool) | Weekly or monthly, automated |
| Sample restore | Restore a handful of random files and one database dump to scratch; compare | Monthly, automated or by hand |
| Full rehearsal | Rebuild a service, or a whole dataset, from backup alone, on spare hardware or a VM | Yearly, and after any change to the backup design |

An integrity check proves the repository is not corrupt. It does not prove
the right data is in it. Only a restore does.

## Sample restore (restic)

```bash
scratch=/mnt/scratch/restore-test-$(date +%F)
mkdir -p "$scratch"
restic snapshots --tag nightly --latest 1
restic ls latest /tank/photos | shuf -n 5                     # pick random files
restic restore latest --target "$scratch" \
  --include /tank/photos/2019/beach-01.jpg                     # one --include per file
# compare against live
sha256sum "$scratch/tank/photos/2019/beach-01.jpg" /tank/photos/2019/beach-01.jpg
```

A file that changed on purpose since the snapshot will differ; pick files
that have not been edited (old photos are ideal), or compare against the
snapshot's own metadata.

borg equivalent: `borg list` to find the archive, then
`borg extract ::<archive> tank/photos/2019/beach-01.jpg` run from inside the
scratch directory (borg extracts into the current directory), then compare.

For ZFS replicas, browse the received snapshot read-only on the backup box
(`/backup/photos/.zfs/snapshot/<name>/`) and compare a sample.

## Database dumps: restore into a throwaway container

A dump that exists is not a dump that restores. For Postgres:

```bash
docker run -d --name restore-test -e POSTGRES_PASSWORD=throwaway postgres:16.4
docker exec -i restore-test sh -c 'until pg_isready; do sleep 1; done'
docker exec -i restore-test createdb -U postgres restored
docker exec -i restore-test pg_restore -U postgres -d restored < "$scratch/photos-2026-10-10.dump"
docker exec -i restore-test psql -U postgres -d restored -c 'select count(*) from assets;'
docker rm -f restore-test
```

Check a row count or a recent record against what you expect, not just that
the command exited 0. The table name above is illustrative; use one from the
app.

## Full rehearsal

Pick one important service or dataset per year and rebuild it on a spare
machine or VM using only:

- the stack repository (`homelab-operations` layout),
- the backup repository and its password from the written recovery note,
- the restore commands from the stack README.

Time it. If the restore of the photo library over the internet from the
off-site copy would take days, the user should know that now (and may want a
"bring the disk home" option in the plan).

## Recording results

Write each test into the workspace, so "are my backups OK?" has a dated
answer:

```markdown
## Restore test 2026-10-11 (sample, monthly)

- Repository: local restic (/mnt/backupdisk/restic), snapshot 4be1c2a0 (2026-10-10 02:14)
- Integrity: `restic check --read-data-subset=5%` — no errors
- Files: 5 random photos (2014–2021) — hashes match live
- Database: photos dump restored into throwaway Postgres 16.4 — 48 211 assets (live: 48 230, 19 added since)
- Off-site: not tested this month (next: November)
- Time taken: 12 minutes
- Result: PASS
```

A failed test is an incident, not a footnote: report it to the user, fix the
backup, and re-test before calling it closed.

## In an unattended run

Integrity checks and sample restores are safe to schedule: they read the
repository and write only to scratch. They follow
`scheduled-run-discipline` (bounded, logged, scratch cleaned up afterwards,
failure reported). Scratch clean-up deletes only the run's own scratch
directory, identified by the path the run created. Full rehearsals involve
judgement and are done with the user.
