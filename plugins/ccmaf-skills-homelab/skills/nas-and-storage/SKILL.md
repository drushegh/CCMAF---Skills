---
name: nas-and-storage
description: >-
  Home NAS and storage judgement: choosing mirrors vs parity (mdadm RAID, ZFS
  mirrors/RAIDZ, appliance OSes), reading pool and array health, scrubs,
  SMART monitoring and what the attributes mean, replacing a failing disk,
  snapshots, the 3-2-1 backup rule with restic/borg/ZFS send, retention, and
  restore testing. Destructive storage operations are always dry-run and
  confirm. Use whenever someone stores data at home: "set up a NAS", "RAID
  or ZFS?", "my pool is degraded", "a disk is failing", "SMART errors",
  "zpool status", "mdadm", "/proc/mdstat", "smartctl", "how should I back up
  my photos", "3-2-1", "test my backups", "restore from my NAS or home
  server backup", TrueNAS,
  Unraid, OpenMediaVault, Synology-style boxes, external USB backup drives.
  Running services → homelab-operations; the change protocol →
  safe-system-changes.
---

# NAS and Storage

At home, storage fails in three ways: a disk dies, a person deletes or
overwrites something, or the house loses everything at once (theft, fire,
flood, ransomware). RAID only addresses the first. This skill keeps those
apart: redundancy keeps the NAS running through a disk failure, snapshots
undo mistakes, backups in other places survive the house. It is for a
hobbyist with a few disks, not a storage team.

Context (October 2026, re-verify): OpenZFS 2.2/2.3 on Linux and in TrueNAS;
RAIDZ expansion (adding one disk to an existing RAIDZ vdev) arrived in
OpenZFS 2.3 and is version-dependent; mdadm remains the Linux software RAID
tool; smartmontools 7.x provides `smartctl` and `smartd`; restic and borg
(1.x and 2.x lines) are the common free backup tools. Check versions on the
box before asserting a feature.

## Non-negotiables

1. **RAID is not a backup.** Redundancy copies deletions, corruption and
   ransomware to every disk instantly. Every "my data is safe because RAID"
   gets the 3-2-1 conversation.
2. **Destructive operations are dry-run, then confirm, then journal.**
   Creating, adding to, destroying or re-laying-out a pool or array, wiping
   or partitioning a disk, `zfs destroy`, `zpool labelclear`, `mdadm
   --zero-superblock`, `wipefs`, `mkfs`: show the exact command, the exact
   device by its stable ID, and what will be lost; run the tool's dry-run
   where one exists (`zpool create -n`, `zpool add -n`, `zfs destroy -nv`);
   the user confirms with that worst case visible. High tier under
   `safe-system-changes`; where possible the user types the final command.
3. **Identify disks by stable ID, never by `sdX`.** `/dev/sdb` can change at
   the next boot. Use `/dev/disk/by-id/…` and cross-check the serial number
   against the physical label before pulling or wiping anything.
4. **A degraded array is an emergency for backups, not for repairs.** First
   make sure the most recent backup is good (or take one), then replace the
   disk. A rebuild is the most stressful moment in a pool's life.
5. **Monitor or it did not happen.** Scheduled scrubs (ZFS) or checks
   (mdadm), scheduled SMART self-tests, and alerts that reach a phone
   (`homelab-operations`, monitoring basics).
6. **Backups are proven by restores.** A scheduled, logged restore test of a
   sample of files, plus a full rehearsal at least once a year. An untested
   backup is a hope.
7. **Appliances own their pools.** On TrueNAS, Unraid, OpenMediaVault or a
   vendor NAS, use the web UI or the vendor's documented CLI. Changing pools
   from the shell behind the appliance's back desynchronises its
   configuration database.

## Decision points

| Question | Home default |
|---|---|
| Two disks | Mirror (ZFS mirror or mdadm RAID1) |
| Three to six disks, capacity matters | RAIDZ2 / RAID6 for large disks; RAIDZ1 / RAID5 only for small disks with good backups, because rebuilds of big disks take long enough for a second failure |
| Want easy growth with mixed disk sizes | Unraid-style parity or mirrors added in pairs; a RAIDZ vdev's width is hard to change (expansion is version-dependent) |
| ZFS or mdadm + ext4/XFS? | ZFS if you want checksums, snapshots and send/receive and have RAM to spare (8 GB+ is comfortable); mdadm for simplicity or very low-resource boxes |
| Btrfs RAID | Mirrors (RAID1) are fine; avoid Btrfs RAID5/6 for data you care about (upstream still documents caveats; verify current status) |
| Hardware RAID card | Avoid with ZFS; use an HBA in IT mode so ZFS sees the disks directly |
| SMR disks | Avoid in any parity or mirror array; resilvers can take days or fail. Check the model against the maker's CMR/SMR list |
| ECC memory | Nice to have, not a prerequisite for ZFS at home |
| Backup tool | restic or borg to a second disk and to an off-site target; ZFS send/receive between ZFS boxes |

## Workflow: something is wrong with a disk or pool

1. **Read-only triage**: `zpool status -x` / `zpool status -v`,
   `cat /proc/mdstat` and `mdadm --detail /dev/mdX`, `smartctl -H -A` per
   disk, `dmesg`/`journalctl -k` for I/O errors. Map every device name to
   its by-id path and serial.
2. **Classify**: one disk failing or failed; cabling/controller (errors on
   several disks at once, CRC counts rising); data errors with healthy
   disks (scrub found corruption); full pool.
3. **Protect the data**: confirm the latest backup is good or run one now,
   before any repair.
4. **Plan the repair** from the references (disk replacement, cable reseat,
   restore of named files), dry-run where the tool allows, show it.
5. **Confirm, apply, journal**, one step at a time.
6. **Verify**: resilver/rebuild complete, scrub or check clean, SMART on the
   new disk passes a long test, alerts clear.

## High-frequency pitfalls

- **`zpool add` when you meant `zpool attach`.** `attach` adds a disk to an
  existing mirror (or turns a single disk into a mirror); `add` creates a new
  top-level vdev, often with no redundancy, which you generally cannot
  remove from a pool containing RAIDZ vdevs. Always `zpool add -n` first and
  read the resulting layout.
- **Replacing the wrong disk.** `sdc` in the logs is not necessarily the
  third bay. Match the serial in `smartctl -i` or `ls -l /dev/disk/by-id/`
  to the label on the drive; on many NAS cases, use the bay's locate LED.
- **Pool too full.** ZFS performance and fragmentation degrade badly past
  roughly 80 % used; copy-on-write needs free space even to delete. Alert at
  80 %.
- **Treating one SMART attribute as gospel.** Some raw values are
  vendor-encoded and huge by design (Seagate's raw read error rate). Watch
  reallocated, pending and offline-uncorrectable sectors and their trend.
- **No scrubs.** Silent corruption is only found when it is read. Scrub
  monthly (ZFS) or run the md check monthly (Debian ships one by default;
  verify on the host).
- **USB enclosures for permanent pool members.** Bridges drop out, hide SMART
  and reorder devices. Fine for rotating backup disks, poor for a pool.
- **Backups on the same NAS, or always connected.** Ransomware and a single
  bad command reach every mounted copy. Keep one copy offline or
  append-only.
- **Encryption keys stored only on the encrypted system.** Keep restic/borg
  passwords and ZFS encryption keys in a password manager or printed in a
  safe place.

## How to verify (the skill's own gates)

- [ ] Every device in a plan is named by `/dev/disk/by-id/…` and the serial
      was matched to the physical disk before pulling or wiping it.
- [ ] Destructive commands were shown with their dry-run output (or the
      statement "this tool has no dry-run" and what will be lost), and the
      user confirmed with the worst case visible.
- [ ] Before any repair or layout change, the latest backup was confirmed
      good.
- [ ] After a repair: `zpool status` shows no errors and a completed
      resilver, or `/proc/mdstat` shows `[UU…]` with no recovery running;
      then a scrub/check was started or scheduled.
- [ ] Backup claims are backed by a restore test result with a date.

## Reference index

| Load when... | File |
|---|---|
| Choosing a layout, reading or repairing an mdadm array | [references/raid-and-mdadm.md](references/raid-and-mdadm.md) |
| ZFS pools: layout, status, scrubs, snapshots, replacing disks, send/receive | [references/zfs-basics.md](references/zfs-basics.md) |
| SMART: reading attributes, self-tests, smartd scheduling and alerts | [references/smart-and-disk-health.md](references/smart-and-disk-health.md) |
| Designing backups: 3-2-1, restic/borg, ZFS replication, retention, off-site | [references/backup-strategy-3-2-1.md](references/backup-strategy-3-2-1.md) |
| Proving backups restore: routine tests, full rehearsals, recording results | [references/restore-testing.md](references/restore-testing.md) |
| Seeing the whole protocol on a failing-disk replacement | [references/worked-example.md](references/worked-example.md) |

## Boundaries with sibling skills

- **Running services on the box, getting consistent dumps out of them,
  monitoring and alert delivery** → `homelab-operations`. This skill decides
  where data lives and proves it restores.
- **Media libraries, Plex/Jellyfin, *arr apps** → `media-server-stack`
  (it relies on this skill for the storage underneath).
- **The change protocol** for every destructive step → `safe-system-changes`;
  **backup jobs and scrubs run unattended** → `scheduled-run-discipline`.
- **Server-grade Linux** (LVM at scale, multipath, enterprise storage,
  fleet backup policy) → `linux-administration`; filesystem and block-device
  fundamentals → `linux-development`.
- **Storage and backup settings on a Windows PC** (as opposed to the NAS it
  backs up to) → `windows-administration`.
- **Ransomware or a suspected compromise** → `incident-response` (isolate,
  preserve, then restore from a known-good copy).
- **Backup script mechanics** → `bash-development`.
