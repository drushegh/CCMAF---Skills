# Getting Consistent Backups Out of Services

This file is about the first half of a backup: producing a copy of each
service's state that would actually restore. Where those copies go, how many
there are, retention and restore testing are `nas-and-storage`
(`references/backup-strategy-3-2-1.md` and `references/restore-testing.md`).

## What to back up per stack

| Item | Why | How |
|---|---|---|
| Stack folder (`compose.yaml`, `.env.example`, `config/`) | Rebuild the service | Git repository, pushed somewhere off the box |
| `.env` and secret files | Rebuild with the same credentials | Encrypted backup only (restic/borg repositories are encrypted); never plain git |
| Application data (bind mounts, named volumes) | The thing you cannot recreate | File-level backup, after quiescing |
| Databases | Data files copied live are inconsistent | Logical dump, or stop the container first |
| Host config (`/etc` changes, crontabs, systemd units) | Rebuild the host | `etckeeper`, or copy the files you changed into the repo |
| Recorded image digests | Restore the same version | From the journal |

What you can skip: images (re-pullable if pinned), caches, transcodes,
thumbnails and other derived data. Large media libraries are a separate
decision: re-downloadable content may not need three copies, irreplaceable
photos do.

## Consistency: the core rule

A copy of files taken while an application is writing them can be
internally inconsistent: a database page half-written, an index pointing at
a record not yet in the copy. Choose one of these per stack:

1. **Logical dump** (best for databases; stack stays up):

   ```bash
   cd /opt/stacks/photos
   docker compose exec -T db pg_dump -U photos -Fc photos \
     > "/srv/backup-staging/photos/photos-$(date +%F).dump"
   # MariaDB/MySQL equivalent: mariadb-dump / mysqldump --single-transaction
   # SQLite inside an app: sqlite3 app.db ".backup '/staging/app.db'" while the app is idle
   ```

   `-T` disables the pseudo-terminal so the binary dump is not mangled.
   Check the dump is non-empty and, for Postgres custom format, readable:
   `pg_restore --list file.dump | head`.

2. **Stop, copy, start** (simplest; brief downtime):

   ```bash
   docker compose stop
   # copy ./data with the backup tool, or take a filesystem snapshot
   docker compose start
   ```

3. **Filesystem snapshot** (ZFS, Btrfs, LVM): crash-consistent, like pulling
   the power. Databases with a write-ahead log usually recover from that, but
   pair it with a dump for anything important. Snapshot, then back up from
   the snapshot (`nas-and-storage`, ZFS reference).

Many apps document their own backup procedure (an export command, a
maintenance mode, which folders matter). Use it in preference to a generic
recipe; it knows about files you do not.

## Named volumes

Bind mounts are ordinary folders. Named volumes live under Docker's data root
(`/var/lib/docker/volumes/`) and are easy to forget. Either include that path
deliberately, or export each volume:

```bash
docker volume ls
docker run --rm \
  -v photos_cache:/source:ro \
  -v /srv/backup-staging/photos:/backup \
  alpine:3.20 tar -czf /backup/photos_cache.tar.gz -C /source .
```

Stop the service using the volume first, unless it is read-only data.

## A backup script's shape

The backup job runs unattended, so it follows `scheduled-run-discipline`:
bounded, idempotent, logged, reports failure, deletes nothing outside its own
staging area. Script mechanics (strict mode, quoting, traps) are
`bash-development`.

```text
for each stack in the backup list:
    1. dump databases into staging (or stop the stack)
    2. verify the dump is non-empty and readable
    3. back up stack folder + data + staging with the backup tool
    4. restart the stack if it was stopped (in a trap, so failure still restarts it)
    5. log result per stack
then:
    6. ping the dead-man's switch only if every stack succeeded
    7. remove staging dumps older than N days (staging only)
```

Step 4 in a trap matters: a script that stops the stack and dies leaves the
service down until someone notices.

## Pitfalls

- **Backing up `/var/lib/docker` wholesale** while Docker runs: large,
  inconsistent, and tied to a Docker version. Back up the data, not the
  engine's internals.
- **Permissions and ownership lost on restore**: many images run as a
  specific UID. Use a backup tool that preserves ownership (restic, borg,
  `rsync -a`, `tar` run as root) and record the UID in the stack README.
- **The dump goes to the same disk as the data.** Staging is fine; the
  backup proper must leave the disk and then the house (`nas-and-storage`).
- **Secrets in the backup unencrypted.** `.env` files and dumps contain
  credentials and personal data; the repository must be encrypted and its
  key stored somewhere that survives the server (a password manager).
- **"The backup job is green" is not proof.** Only a restore is
  (`nas-and-storage`, restore testing).
