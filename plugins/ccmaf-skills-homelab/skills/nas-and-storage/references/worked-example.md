# Worked Example: A Failing Disk in a ZFS Mirror

Fictional setup: a self-built NAS `nas01.home.arpa` (Debian 12, OpenZFS 2.2)
with pool `tank` as a two-way mirror of 8 TB disks. Nightly restic backups go
to a USB disk and weekly to a relative's box over WireGuard. smartd mails the
user, who forwards the alert: "Device: /dev/sdb, 8 Currently unreadable
(pending) sectors". The user asks: "Is my NAS dying? What do I do?"

## 1. Triage (read-only)

```bash
zpool status -v tank
sudo smartctl -i -A -l selftest /dev/sdb
sudo smartctl -H -A /dev/sda
ls -l /dev/disk/by-id/ | grep -E 'sd[ab]$'
journalctl -k --since "7 days ago" | grep -iE 'sdb|ata[0-9]+.*error' | tail
```

Findings:

- `tank` is ONLINE; `sdb` shows `CKSUM 0`, `READ 3`. Last scrub 9 days ago
  repaired 128K.
- `sdb` = `ata-EXAMPLE_8TB_SERIALB2`; attribute 197 raw 8 (was 0 a month
  ago in the journal), 5 raw 16, 199 raw 0; last long test: "Completed: read
  failure" at a listed LBA.
- `sda` = `ata-EXAMPLE_8TB_SERIALA1`: all counts 0, long test passed last
  Saturday.
- No link (CRC) errors, so not a cable problem.

Classification: one disk failing; pool still redundant.

## 2. Protect the data first

```bash
restic -r /mnt/backupdisk/restic snapshots --latest 1
```

The last local snapshot is from 02:10 today; the latest restore-test record
(workspace) is three weeks old and passed. The off-site copy last ran four
days ago. The plan includes a fresh off-site run before the replacement,
because the resilver will put the only healthy disk under full read load.

## 3. Plan (shown before anything is written)

```text
Run 2026-10-11-03 — replace failing disk in tank (mirror)          Tier: High

0. Trigger the off-site backup now; wait for success.               (Low)
1. User installs the new 8 TB CMR disk in the spare bay (no removal yet).
   I identify it by serial and run `smartctl -i` + a short test on it.
2. sudo zpool replace tank \
     /dev/disk/by-id/ata-EXAMPLE_8TB_SERIALB2 \
     /dev/disk/by-id/ata-EXAMPLE_8TB_SERIALC3
   The failing disk stays attached during resilver, so the mirror is never
   reduced to one copy. zpool replace has no dry-run; what it does: copies
   tank onto SERIALC3 and detaches SERIALB2 when finished. All existing data
   on SERIALC3 is overwritten (it is new and empty).
   Undo before completion: `zpool detach tank <SERIALC3>` cancels.
   Worst case: the healthy disk SERIALA1 fails during resilver while SERIALB2
   cannot supply the bad blocks → some files lost → restore from backup.
3. After resilver: scrub tank; long SMART test on SERIALC3.
4. User removes SERIALB2 after I confirm its serial and bay.
```

The user approves, installs the disk and confirms it is in bay 3.

## 4. Apply, one step at a time

```bash
ls -l /dev/disk/by-id/ | grep SERIALC3        # present, no partitions
sudo smartctl -i /dev/disk/by-id/ata-EXAMPLE_8TB_SERIALC3
sudo smartctl -t short /dev/disk/by-id/ata-EXAMPLE_8TB_SERIALC3
# ...short test passed

sudo zpool replace tank \
  /dev/disk/by-id/ata-EXAMPLE_8TB_SERIALB2 \
  /dev/disk/by-id/ata-EXAMPLE_8TB_SERIALC3
zpool status tank
#   replacing-1  ONLINE
#     ata-EXAMPLE_8TB_SERIALB2  ONLINE
#     ata-EXAMPLE_8TB_SERIALC3  ONLINE  (resilvering)
#   scan: resilver in progress … 11h20m to go
```

Journal entry written with before layout, command, undo and the worst case
the user accepted. The resilver runs overnight; the morning check is read-only.

## 5. Verify by observation

```bash
zpool status -v tank      # resilvered 5.1T with 0 errors; mirror-0: SERIALA1, SERIALC3
sudo zpool scrub tank     # (confirmed as part of the approved plan)
# ...next day:
zpool status tank         # scrub repaired 0B with 0 errors
sudo smartctl -t long /dev/disk/by-id/ata-EXAMPLE_8TB_SERIALC3
```

Then the physical removal: `smartctl -i` on the old disk's path confirms
SERIALB2; the user matches the label in bay 2 and pulls it. The journal
records the old disk's final SMART values. Wiping the old disk before
disposal is a separate, explicitly confirmed step on that disk alone (or the
user destroys it physically).

## 6. Summary to the user

> Your NAS is fine now. One disk was developing bad sectors; the risk to
> your data stayed low throughout because the mirror stayed complete during
> the swap and a fresh off-site backup ran first. The new disk passed its tests and the
> pool scrubbed clean. The old disk is out of the pool and safe to remove;
> it still holds your data, so wipe or destroy it before throwing it away.
> Next restore test is due in a week.

## What would have stopped the run

- Both disks showing pending sectors: stop all repair talk, run and verify a
  backup first, then discuss options.
- The off-site backup failing: fix that before step 2.
- The new disk turning out to be SMR or smaller than the old one
  (`zpool replace` refuses smaller devices): stop and source a suitable disk.
- Any surprise in `zpool status` (an unexpected vdev, a device listed by
  `sdX` instead of by-id): report and ask before continuing.
