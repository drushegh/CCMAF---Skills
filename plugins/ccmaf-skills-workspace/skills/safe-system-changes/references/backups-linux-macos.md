# The Same Safety Net on Linux and macOS

The protocol does not change across platforms; only the tools for the safety
net do. Map the three Windows layers like this:

| Layer | Windows | Linux | macOS |
|---|---|---|---|
| System-wide net | Restore point (`Checkpoint-Computer`) | Filesystem snapshot (Btrfs/Snapper, LVM, ZFS) or Timeshift | APFS local snapshot (`tmutil localsnapshot`) |
| Settings store backup | `reg export` | Copy of the config file under `/etc` or `~/.config`; `etckeeper` | `defaults export <domain> <file>` |
| File backup | `Copy-Item` + hash | `cp -a` + `sha256sum` | `cp -p` (or `ditto`) + `shasum -a 256` |
| Package state | `winget export` | `dpkg --get-selections`, `rpm -qa`, `pacman -Qqe` | `brew bundle dump` |
| Dry-run | `-WhatIf` | `apt-get -s`, `dnf --assumeno`, `rsync -n` | `brew install --dry-run` (version-dependent) |
| Elevation prompt | UAC | `sudo` | `sudo` / authorisation dialog |

## Linux

**System-wide net** depends on the filesystem; detect before promising one:

```bash
findmnt -no FSTYPE /          # btrfs, ext4, xfs, zfs ...
command -v snapper timeshift lvs zfs 2>/dev/null
```

- **Btrfs with Snapper**: `sudo snapper -c root create --description "ccmaf run 2026-10-11-01"`;
  list with `snapper -c root list`. Some distributions (openSUSE, recent
  Fedora/Ubuntu variants) also snapshot automatically around package
  transactions; check rather than assume.
- **Timeshift** (common on desktop distributions):
  `sudo timeshift --create --comments "ccmaf run 2026-10-11-01"`. In rsync
  mode it excludes home directories by default.
- **LVM**: a snapshot needs free space in the volume group
  (`sudo lvcreate -s -n pre-run -L 5G /dev/vg0/root`). A full snapshot becomes
  invalid; size it for the run and remove it after. Medium-tier operation in
  itself; plan and confirm.
- **ZFS**: `sudo zfs snapshot pool/root@pre-run-2026-10-11-01`.
- **ext4/xfs without LVM**: there is no system-wide net. Say so and rely on
  targeted backups; for anything High-tier, suggest a full backup first.

**Settings**: back up the exact file, preserving owner, mode and timestamps:

```bash
bk="$WORKSPACE/backups/2026-10-11-01"
mkdir -p "$bk"
sudo cp -a /etc/ssh/sshd_config "$bk/01-sshd_config"
sudo sha256sum /etc/ssh/sshd_config "$bk/01-sshd_config"
```

- Validate config before reloading where the tool allows it: `sshd -t`,
  `nginx -t`, `visudo -c`, `systemd-analyze verify <unit>`. A config that
  fails validation is never applied.
- `etckeeper` (if installed) commits `/etc` to git; `etckeeper commit` before
  and after gives a diffable record.
- For systemd, capture `systemctl is-enabled <unit>` and
  `systemctl is-active <unit>`; prefer drop-ins
  (`systemctl edit <unit>`) over editing vendor units, because removing the
  drop-in is a clean undo.
- **Remote machines**: before changing SSH, firewall or network config, keep a
  second session open and, where possible, schedule an automatic rollback
  (for example an `at` job that restores the backup in 5 minutes, cancelled
  once you have verified access). Locking yourself out is the classic failure.

## macOS

- **APFS local snapshot**: `tmutil localsnapshot` requests a local snapshot
  (behaviour varies by macOS version and Time Machine setup, so verify with
  `tmutil listlocalsnapshots /` afterwards, exactly as with Windows restore
  points).
  Local snapshots are thinned automatically and are short-lived: a safety net
  for a session, not a backup. Restoring is done from macOS Recovery, which is
  a user action.
- **Preferences**: `defaults read <domain> <key>` for the before value;
  `defaults export <domain> "$bk/<domain>.plist"` before a change;
  `defaults import <domain> <file>` replaces the domain. Some apps cache
  preferences (`cfprefsd`) and need restarting to see a change.
- **System Integrity Protection** and the signed system volume block changes
  to system locations. Never suggest disabling SIP to make a change work.
- **Launch agents/daemons**: capture `launchctl print` output for the label and
  back up the plist before `launchctl bootout`/`bootstrap`.

## Cross-platform rules that do not change

- Backups live in the workspace backup folder, named by run and change number.
- Verify each backup (hash or non-empty check) before the change.
- The undo is written from the captured before value.
- A snapshot you created is removed (with confirmation) once the run is
  verified and the user is satisfied, unless they want to keep it. LVM and
  ZFS snapshots consume space indefinitely; journal their removal too.
