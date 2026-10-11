# SMART and Disk Health

SMART is a disk's own report on its health. It predicts some failures well
(growing bad sectors) and others not at all (sudden electronics failure), so
it complements redundancy and backups rather than replacing them. Reading it
is safe; self-tests are safe but add load; nothing here writes data.

Syntax checked against the smartctl(8) and smartd.conf(5) man pages
(smartmontools 7.x).

## Reading a disk (read-only)

```bash
sudo smartctl --scan                       # devices and the type smartctl will use
sudo smartctl -i /dev/sda                  # model, serial, firmware, SMART support
sudo smartctl -H /dev/sda                  # overall verdict: PASSED / FAILED
sudo smartctl -A /dev/sda                  # attribute table (ATA)
sudo smartctl -l selftest /dev/sda         # self-test history
sudo smartctl -x /dev/sda                  # everything, including device statistics
sudo smartctl -a /dev/nvme0                # NVMe health log
```

- Behind USB bridges, pass the device type: `-d sat` works for most;
  some bridges hide SMART entirely.
- To avoid waking a sleeping disk during a scripted check, add `-n standby`.
- Map `/dev/sdX` to the physical disk with `-i` (serial) and
  `ls -l /dev/disk/by-id/` before acting on anything.

## The verdict is not enough

`-H PASSED` only means no attribute has crossed the maker's failure
threshold. Disks often fail with PASSED. The attributes and logs carry the
real signal.

## ATA attributes that matter

| ID | Name | What it means | Action |
|---|---|---|---|
| 5 | Reallocated_Sector_Ct | Sectors remapped to spares | Non-zero: watch. Rising: plan replacement |
| 197 | Current_Pending_Sector | Sectors that failed a read and await remap | Non-zero: run a long test; persistent or rising: replace |
| 198 | Offline_Uncorrectable | Sectors unreadable during offline scan | Non-zero alongside 197: replace soon |
| 187 | Reported_Uncorrect | Errors the disk could not correct | Rising: replace |
| 199 | UDMA_CRC_Error_Count | Errors on the cable/link, not the platters | Rising: reseat or swap the SATA cable/backplane port; not a disk fault |
| 9 | Power_On_Hours | Age | Context for planning; not a fault |
| 194 | Temperature_Celsius | Current temperature | Sustained above roughly 50 °C for HDDs: improve airflow |

Read the **RAW_VALUE** for these counts; the normalised VALUE/WORST/THRESH
columns are vendor-scaled. Some raw values are vendor-encoded and look
alarming while meaning nothing (raw read error rate and seek error rate on
some makes). The trend matters more than any one reading: record values
monthly or let smartd track changes.

## NVMe health

`smartctl -a /dev/nvme0` shows the NVMe health log: `Critical Warning`
(should be 0x00), `Percentage Used` (wear against rated endurance; 100 % is
the rating, not death), `Available Spare` against its threshold, `Media and
Data Integrity Errors` (should be 0), and unsafe shutdowns. NVMe self-tests
need a recent smartmontools and drive support (verify with `smartctl -c`).

## Self-tests

```bash
sudo smartctl -c /dev/sda                  # supported tests and estimated durations
sudo smartctl -t short /dev/sda            # minutes
sudo smartctl -t long  /dev/sda            # hours on large HDDs; the disk stays usable
sudo smartctl -l selftest /dev/sda         # results afterwards
```

A long test reads the whole surface and is the best single check of a new
disk (burn-in) or a suspicious one. A failed self-test with an LBA listed is
a replacement signal, for a disk in an array as much as a standalone one.

New disks: before trusting one with data, run a long SMART test and, if time
allows, a full read/write burn-in. Write-based burn-in tools destroy all data
on the disk; that is fine for a brand-new empty disk, and a stop-and-ask on
anything else (`safe-system-changes`).

## smartd: schedule and alert

Enable the smartd service (`smartmontools` package; unit named `smartd` or
`smartmontools` depending on distribution, verify). A home-scale
`/etc/smartd.conf` (the usual path; some packages use
`/etc/smartmontools/smartd.conf`, verify):

```text
# Monitor every detected disk: all checks, offline data collection,
# attribute autosave, short test daily 02:00-03:00, long test Saturdays 03:00-04:00,
# skip checks while a disk is in standby, mail on problems.
DEVICESCAN -a -o on -S on -n standby,q -s (S/../.././02|L/../../6/03) -m admin@example.home.arpa
```

- `-s` takes `T/MM/DD/d/HH` patterns (test type, month, day of month, day of
  week 1–7 starting Monday, hour); `.` matches anything.
- `DEVICESCAN` makes smartd ignore the rest of the file, so list specific
  devices instead if some need different options (`-d sat` for USB disks).
- `-M test` on the line sends one test mail at startup: use it once to prove
  alerts arrive, then remove it.
- `-m` needs working local mail (a relay such as msmtp or a full MTA). To
  push to a phone instead, `-M exec /path/to/script` runs a script on
  warnings (verify the environment variables smartd passes, in
  smartd.conf(5) for your version).
- Validate config by restarting the service and reading its log
  (`journalctl -u smartd` or `-u smartmontools`): smartd logs every device
  it registered and any parse errors.

Appliance OSes (TrueNAS, OpenMediaVault, Unraid) configure SMART tests and
alerts in their UI; do it there.

## Pre-failure playbook

1. Attribute 5/197/198 non-zero or a self-test failed: confirm the latest
   backup is good.
2. Run a long self-test if one has not run since the change.
3. In an array: plan the replacement now (`raid-and-mdadm.md` or
   `zfs-basics.md`), using `--replace` or a ZFS replace with the old disk
   still attached so redundancy is kept during the copy.
4. Standalone disk: copy data off first, with a tool that tolerates read
   errors if needed, before any repair attempt. Never run filesystem repair
   (`fsck`) on a disk that is physically failing; image it first.
5. Journal the readings that triggered the action, so the trend is on record.
