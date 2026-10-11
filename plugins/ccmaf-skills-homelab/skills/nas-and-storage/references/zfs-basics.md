# ZFS Basics for a Home NAS

ZFS combines volume manager and filesystem: it checksums every block, repairs
from redundancy on read or scrub, and gives cheap snapshots and replication.
It also makes some mistakes permanent. The rule is the same as everywhere in
this skill: read freely, and run every layout-changing command first with
`-n` (where it exists), show the result, then confirm.

Command syntax checked against the OpenZFS man pages (openzfs.github.io,
October 2026). On TrueNAS, do pool work in the web UI.

## Vocabulary that prevents mistakes

- **Pool** (`zpool`): made of one or more top-level **vdevs**. Data is
  striped across vdevs. **Lose any one vdev and the whole pool is lost.**
- **vdev**: a single disk, a mirror, or a RAIDZ1/2/3 group. Redundancy lives
  inside a vdev, never across vdevs.
- **Dataset** (`zfs`): a filesystem inside the pool with its own properties
  (compression, quota, snapshots, encryption). One dataset per kind of data
  (`tank/photos`, `tank/backups`, `tank/media`) makes snapshot and backup
  policy per dataset possible.
- **ashift**: the sector size exponent, fixed per vdev at creation. Use
  `ashift=12` (4 KiB) for modern disks; a wrong value cannot be changed later.

## Reading state (read-only)

```bash
zpool list                                  # size, allocated, free, health
zpool status -x                             # "all pools are healthy" or only the problem pools
zpool status -v tank                        # devices, errors, files with data errors
zfs list -o name,used,avail,refer,compressratio,mountpoint
zfs list -t snapshot -o name,used,creation -s creation
zpool get capacity,fragmentation,ashift tank
zpool history tank | tail -n 20             # what was done to the pool, and when
```

Reading `zpool status`: the `READ`, `WRITE` and `CKSUM` columns count errors
per device since the last clear. A few checksum errors on one disk after a
power cut may be a one-off; rising counts, or errors on several disks
attached to the same cable or controller, point at hardware. The `scan:`
line shows the last scrub or resilver and whether it repaired anything.

## Creating a pool (High tier, dry-run first)

```bash
ls -l /dev/disk/by-id/ | grep -v part       # pick disks by ID, record serials
sudo zpool create -n -o ashift=12 tank mirror \
  /dev/disk/by-id/ata-EXAMPLE_DISK_A1 /dev/disk/by-id/ata-EXAMPLE_DISK_B2
# -n prints the layout that would be created; nothing is written
```

Show the dry-run output and the statement "all data on these two disks will
be destroyed" to the user; on confirmation, run without `-n`. Then set
sensible dataset defaults:

```bash
sudo zfs set compression=lz4 atime=off tank   # lz4 is cheap and usually a win
sudo zfs create tank/photos
```

Native encryption (`-o encryption=on -o keyformat=passphrase`) is set when a
dataset is created and cannot be added later in place; plan it up front and
store the passphrase outside the NAS.

## Growing a pool: attach vs add

| Goal | Command | Notes |
|---|---|---|
| Turn a single disk into a mirror, or a 2-way into a 3-way mirror | `zpool attach tank <existing> <new>` | Safe; resilvers onto the new disk |
| Add one disk to an existing RAIDZ vdev | `zpool attach tank raidz2-0 <new>` | RAIDZ expansion: needs OpenZFS 2.3+ and the `raidz_expansion` feature (verify); existing data keeps its old parity ratio until rewritten |
| Add a new vdev (more capacity) | `zpool add -n tank mirror <new1> <new2>` then without `-n` | Permanent in practice: with any RAIDZ vdev in the pool, a top-level vdev cannot be removed |
| Bigger disks, same layout | Replace each disk in a vdev one at a time, with `autoexpand=on` | Capacity grows when the last disk in the vdev is replaced |

`zpool attach` and `zpool replace` have no `-n`; `zpool add` and `zpool
create` do. The classic disaster is `zpool add tank <single-disk>` meant as
`attach`: it adds a non-redundant vdev, and the pool now dies with that disk.
`zpool add` warns about mismatched replication and requires `-f` (or an
explicit allow flag) to proceed; never add `-f` to get past that warning.

## Scrubs

```bash
sudo zpool scrub tank          # start
zpool status tank              # progress in the scan: line
sudo zpool scrub -p tank       # pause (resume by starting again)
sudo zpool scrub -s tank       # stop
```

Monthly is the usual home cadence. Many distributions ship a scrub timer
or cron job (for example `zfs-scrub-monthly@tank.timer` on some Debian and
Ubuntu packages; verify with `systemctl list-timers | grep -i scrub`).
Scrubs are I/O heavy; schedule them away from backups.

## Replacing a disk

```bash
sudo zpool status tank                                  # find the FAULTED/DEGRADED member
sudo zpool offline tank /dev/disk/by-id/<failing-disk>  # if still online and you will pull it
# physically swap, matching the serial to the label
sudo zpool replace tank /dev/disk/by-id/<failing-disk> /dev/disk/by-id/<new-disk>
zpool status tank                                       # resilver progress
```

If the old disk still works and there is a spare bay, replace **without**
offlining first: ZFS keeps the old disk participating until the resilver
finishes, so redundancy is never reduced. After the resilver: run a scrub,
then `zpool clear tank` only once the cause is understood (clearing hides the
evidence otherwise).

## Snapshots

Snapshots are instant and read-only; they protect against deletion and
ransomware on the dataset (unless an attacker has root on the NAS). They are
not a backup: they die with the pool.

```bash
sudo zfs snapshot tank/photos@manual-2026-10-11
zfs list -t snapshot tank/photos
ls /tank/photos/.zfs/snapshot/manual-2026-10-11/        # browse; copy files back out
sudo zfs destroy -nv tank/photos@auto-2026-09-01%auto-2026-09-30   # dry-run a range delete
```

- Automate with a snapshot manager (sanoid, zfs-auto-snapshot, or the
  appliance's scheduler) with a retention policy: for example hourly for a
  day, daily for a month, monthly for a year.
- `zfs rollback` discards everything newer than the snapshot (and with `-r`,
  destroys newer snapshots). Restoring individual files from `.zfs/snapshot`
  is almost always the better move. Rollback is High tier.
- Snapshots hold space: deleting files does not free space while snapshots
  reference them. Check `zfs list -o space` before blaming "missing" space.

## Replication: send and receive

```bash
# First full copy to a second pool or box
sudo zfs send -nv tank/photos@daily-2026-10-10                 # dry-run: size estimate
sudo zfs send tank/photos@daily-2026-10-10 | ssh backupbox sudo zfs receive -u backup/photos
# Incremental afterwards
sudo zfs send -i @daily-2026-10-10 tank/photos@daily-2026-10-11 \
  | ssh backupbox sudo zfs receive -u backup/photos
```

- Tools like syncoid (from the sanoid project) handle snapshot bookkeeping
  and resuming; use one rather than hand-rolled scripts for a recurring job.
- `zfs receive -F` rolls back the target and, with replication streams,
  destroys target snapshots that no longer exist on the source. On a backup
  target that is exactly how a mistake on the source propagates. Avoid `-F`
  unless you understand why it is needed for this stream.
- Encrypted datasets can be sent raw (`zfs send -w`), so the backup box never
  holds the key.

## Things that need a stop-and-ask

`zpool destroy`, `zpool labelclear`, `zpool add` (any), `zfs destroy` of a
dataset (not a snapshot), `zfs rollback`, `zpool upgrade` (enables features
older software cannot read; can break boot from older bootloaders), and any
`-f`. Each is shown with its dry-run output where available, the exact
target, and what is lost; the user confirms.
