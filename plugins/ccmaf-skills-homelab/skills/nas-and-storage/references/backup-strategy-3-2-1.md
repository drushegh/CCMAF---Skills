# Backup Strategy: 3-2-1 at Home

**3-2-1**: at least three copies of data you care about, on two different
kinds of storage or devices, with one copy off-site. A useful modern addition
is **one copy offline or immutable** (ransomware cannot encrypt what it
cannot reach) and **zero unverified restores**.

| Copy | Typical home form | Protects against |
|---|---|---|
| 1. Live data | The NAS pool or server disk (with redundancy) | Nothing on its own; redundancy only rides out a disk failure |
| 2. Local backup | A second disk or box in the house: USB disk, a second small NAS, a backup dataset on another pool | Deletion, corruption, a dead pool; fast restores |
| 3. Off-site backup | A relative's or friend's box over VPN, a rotated disk kept elsewhere, or cloud object storage (paid, optional) | Theft, fire, flood, ransomware that reached the house |

Snapshots on the same pool are a fourth layer for quick undo, not one of the
three copies.

## Decide what deserves three copies

Classify before buying disks:

| Class | Examples | Policy |
|---|---|---|
| Irreplaceable | Photos, home videos, documents, password-manager export | Full 3-2-1, off-site, restore-tested |
| Expensive to recreate | Service configs and databases, music you ripped, project files | 3-2-1 or at least local + off-site of the configs |
| Re-downloadable | Media libraries from services you can fetch again, ISO images | Redundancy only, or a cheap single backup; record what you had (a file list) |
| Derived | Thumbnails, transcodes, caches | Exclude |

Writing this table down with the user saves terabytes and makes the
off-site copy affordable.

## Tools (all free; paid targets optional)

| Tool | Strengths | Watch out for |
|---|---|---|
| restic | Encrypted, deduplicated, many targets (local, SFTP, its own rest-server, S3-compatible storage), single binary | Repository password is the only key; lose it and the backup is gone |
| borg (BorgBackup) | Encrypted, deduplicated, compressed, efficient over SSH | Needs borg on the target for SSH repositories; 1.x and 2.x repositories differ (verify the version) |
| ZFS send/receive (syncoid) | Block-level, incremental, preserves snapshots | Both ends need ZFS; a replication mistake can propagate (`zfs-basics.md`) |
| rsync | Simple mirror | A mirror copies deletions and corruption; only a backup when combined with snapshots or versioning on the target |
| Appliance tools | TrueNAS/Synology-style replication and cloud sync tasks | Configure in the UI; same 3-2-1 rules apply |

Avoid a "sync" service (anything that mirrors a folder both ways) as the only
off-site copy: deletion and encryption sync too.

## restic, minimal shape

```bash
export RESTIC_REPOSITORY=/mnt/backupdisk/restic
export RESTIC_PASSWORD_FILE=/root/.config/restic/password   # chmod 600; also in a password manager
restic init                                         # once
restic backup /tank/photos /opt/stacks /srv/backup-staging \
  --exclude-file=/root/.config/restic/excludes --tag nightly
restic snapshots
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --dry-run   # preview retention
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune     # after confirmation
restic check --read-data-subset=5%                   # verify a random 5 % of pack data
```

`forget` removes snapshot records; data is only freed by `prune` (or
`forget --prune`). Always preview retention with `--dry-run` and show it.

## borg, minimal shape

```bash
export BORG_REPO=ssh://backup@offsite.example.home.arpa/./borg-home
export BORG_PASSCOMMAND="cat /root/.config/borg/passphrase"
borg init --encryption=repokey-blake2                # once (borg 1.x syntax; 2.x differs)
borg create --stats ::'{hostname}-{now:%Y-%m-%d}' /tank/photos /opt/stacks
borg prune --dry-run --list --keep-daily 7 --keep-weekly 4 --keep-monthly 12
borg prune --list --keep-daily 7 --keep-weekly 4 --keep-monthly 12   # after confirmation
borg compact                                          # actually frees space
borg check
```

With `repokey`, the key lives in the repository and is protected by the
passphrase; export it anyway (`borg key export`) and store it with the
passphrase. Without both, the backup cannot be read.

## Ransomware and mistake resistance

- **Pull, not push, for the off-site copy** where you can: the off-site box
  connects in and pulls, so a compromised NAS holds no credentials to
  delete the off-site backups.
- **Append-only targets**: restic's rest-server has an append-only mode and
  borg supports append-only repositories (verify flags for your version);
  pruning is then done from the target side or by a separate trusted key.
- **Offline rotation**: two USB disks, one connected and one in a drawer or
  at a relative's house, swapped monthly. Simple and very effective.
- **Snapshots on the backup target** (if it runs ZFS/Btrfs) protect the
  backup repository itself from being overwritten.

## Retention that fits home use

A reasonable default: 7 daily, 4 weekly, 12 monthly, plus yearly for
irreplaceable data. Longer retention costs little with deduplication. Make
sure retention outlives the time it could take to notice a silent problem
(a corrupted photo found months later needs a months-old copy).

## Running backups unattended

Backups run on a timer or cron, unattended, so they follow
`scheduled-run-discipline`: lock against overlap, bounded run, log written,
failure reported (a dead-man's switch that only pings on success,
`homelab-operations` monitoring), pruning previewed in the log. Getting
consistent dumps out of running services first is
`homelab-operations` (`references/service-backups.md`).

## Keys and the "house burned down" test

Write down, outside the house and outside the NAS: where each backup lives,
how to reach it, the repository passwords or key exports, and the restore
command. Then ask: with only a new laptop and that note, could the user get
their photos back? If not, the strategy is not finished.
