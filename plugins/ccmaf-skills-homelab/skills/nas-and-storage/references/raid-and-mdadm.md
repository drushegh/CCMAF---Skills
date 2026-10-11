# RAID Layouts and mdadm

Redundancy buys uptime through a disk failure. It does not protect against
deletion, corruption written by software, theft or fire; that is the backup's
job (`backup-strategy-3-2-1.md`). Choose a layout for how much failure you
want to ride through and how long a rebuild will take, then back up anyway.

## Choosing a layout

| Layout | Disks | Survives | Usable capacity | Home notes |
|---|---|---|---|---|
| Mirror (RAID1 / ZFS mirror) | 2 (or 3) | 1 disk (2 with a three-way mirror) | 1 disk | Simplest, fastest rebuild, easiest to grow by replacing both disks |
| Striped mirrors (RAID10 / ZFS pool of mirrors) | 4, 6, … | 1 per mirror pair | Half | Good performance, grows in pairs |
| Single parity (RAID5 / RAIDZ1) | 3+ | 1 disk | n−1 | Risky with large disks: a long rebuild reads every other disk fully |
| Double parity (RAID6 / RAIDZ2) | 4+ | 2 disks | n−2 | The sensible parity choice for large disks |
| RAID0 / single disk | 1+ | Nothing | All | Scratch space only |
| Unraid-style parity | Mixed sizes | 1 or 2 (parity count) | Sum minus parity disks | Each data disk readable on its own; slower writes |

Rebuild arithmetic: a 16 TB disk rebuilt at an average 150 MB/s takes about
30 hours of full reads on every remaining disk. That window is why RAID5 with
big disks is discouraged, and why the backup must be current before a
rebuild starts.

Mixed disk sizes in classic RAID waste the difference: every member counts
as the smallest. Buying disks from different batches (or makers) reduces the
chance of correlated failures.

## mdadm: reading state (read-only)

```bash
cat /proc/mdstat                        # all arrays; [UU] = healthy, [U_] = degraded
sudo mdadm --detail /dev/md0            # state, members, failed/spare, UUID
sudo mdadm --examine /dev/sdb1          # superblock on one member
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,SERIAL
ls -l /dev/disk/by-id/ | grep -v part
```

In `/proc/mdstat`, `[4/3] [UUU_]` means four members expected, three
present; the underscore marks the missing slot. A `recovery =` or `resync =`
line shows a rebuild or check in progress with an estimate.

`mdadm --detail` states: `clean`/`active` (healthy), `degraded`,
`recovering`, `resyncing`. Members marked `(F)` in `/proc/mdstat` are failed.

## Replacing a failed or failing member

High tier under `safe-system-changes`. Confirm the backup first. mdadm has no
general dry-run mode, so the plan must name each device by ID and serial and
state exactly what each command does.

**Preferred when the old disk still works: `--replace`** keeps full
redundancy while copying to the new disk (mdadm 3.3 and later; verify with
`mdadm --version`):

```bash
# 1. New disk installed; identify it by serial
ls -l /dev/disk/by-id/ | grep -i <new-serial>
# 2. Partition it to match the others (WRITES to the new disk only — check the target twice)
#    GPT: sgdisk copies the table, then gives the copy its own GUIDs.
#    --replicate=<DESTINATION> <SOURCE>: the positional device is the one READ.
sudo sgdisk --replicate=/dev/disk/by-id/<new-disk> /dev/disk/by-id/<healthy-member-disk>
sudo sgdisk --randomize-guids /dev/disk/by-id/<new-disk>
#    Alternative with sfdisk: strip the disk and partition identifiers from the dump
sudo sfdisk -d /dev/disk/by-id/<healthy-member-disk> |
  grep -v '^label-id:' | sed -E 's/, *uuid=[0-9A-Fa-f-]+//' > /tmp/layout.sfdisk
cat /tmp/layout.sfdisk                       # review: no label-id, no uuid=
sudo sfdisk /dev/disk/by-id/<new-disk> < /tmp/layout.sfdisk
# 3. Add as a spare, then replace the failing member onto it
sudo mdadm /dev/md0 --add /dev/disk/by-id/<new-disk>-part1
sudo mdadm /dev/md0 --replace /dev/disk/by-id/<failing-disk>-part1 \
     --with /dev/disk/by-id/<new-disk>-part1
watch cat /proc/mdstat
```

A raw `sfdisk -d` dump, or `sgdisk --replicate` alone, copies the GPT disk
GUID and every partition's unique GUID, so two disks in one machine share
identifiers; tools that address partitions by PARTUUID can then pick the wrong
one (per the `sgdisk` and `sfdisk` man pages). Check afterwards with
`lsblk -o NAME,PTUUID,PARTUUID` that the new disk's values are unique.

When the copy finishes, the old member is marked faulty automatically;
remove it with `--remove`, then pull it.

**When the old disk is already dead** (or absent):

```bash
sudo mdadm /dev/md0 --fail   /dev/disk/by-id/<failed-disk>-part1   # if still listed
sudo mdadm /dev/md0 --remove /dev/disk/by-id/<failed-disk>-part1
# partition the new disk as above, then:
sudo mdadm /dev/md0 --add /dev/disk/by-id/<new-disk>-part1
```

If the array holds the boot partition, the bootloader must also be installed
on the new disk (distribution-specific; verify before rebooting).

Verify: `/proc/mdstat` back to all `U`, `mdadm --detail` shows `clean`, then
run a check (below) and a long SMART test on the new disk.

## Scheduled checks

A check reads every member and compares; it finds latent bad sectors before a
rebuild does.

```bash
echo check | sudo tee /sys/block/md0/md/sync_action    # start a check
cat /sys/block/md0/md/mismatch_cnt                       # after it finishes
```

Debian/Ubuntu ship a monthly check (`checkarray` via cron, or `mdcheck`
systemd timers on newer releases; verify with `systemctl list-timers | grep
mdcheck` or `/etc/cron.d/mdadm`). A non-zero `mismatch_cnt` on RAID1/10 can
be benign (swap, in-flight writes); on RAID5/6 investigate.

## Config and alerts

- Config file: `/etc/mdadm/mdadm.conf` on Debian/Ubuntu, `/etc/mdadm.conf` on
  RHEL-family. It holds `ARRAY` lines (from `mdadm --detail --scan`) and
  `MAILADDR` for alerts. After changing array definitions on Debian,
  regenerate the initramfs (`update-initramfs -u`) so the array assembles at
  boot.
- The monitor daemon (`mdmonitor` service, or the distribution's
  equivalent) mails `MAILADDR` on failure events. Test delivery:
  `sudo mdadm --monitor --scan --oneshot --test`.

## Things not to do

- `mdadm --create` over disks that hold an existing array "to fix it". It
  writes new superblocks; with wrong parameters the data is gone. Recovery of
  an array that will not assemble starts with `--examine` on every member and
  `--assemble --scan`, and is a stop-and-ask situation.
- `--zero-superblock`, `wipefs -a` or `mkfs` on any device not triple-checked
  by serial. These have no undo.
- `--force` on assemble without understanding why the array refused: it can
  assemble with stale members. Ask, and make sure backups are current first.
- Growing or reshaping (`--grow`, changing RAID level or member count) on a
  live array without a backup. Reshapes run for many hours and need a
  `--backup-file` on some transitions; read the man page for your version.
