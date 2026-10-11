# Updates and Rollback

Two kinds of update, two different policies. Host security patches are small,
frequent and well tested: automate them. Container image updates change
application behaviour and sometimes data formats: do them by hand, one stack
at a time, with the previous version recorded so rollback is one command.

Every update below that writes anything follows `safe-system-changes`
(plan, confirm, journal, verify). In an unattended run, only the host
security-patch path is allowed to apply changes; everything else is reported
for the user (`scheduled-run-discipline`).

## Host OS

### Debian, Ubuntu, Raspberry Pi OS

```bash
sudo apt update
apt list --upgradable                     # what would change (read-only)
sudo apt-get -s upgrade                   # simulate; nothing is installed
sudo apt upgrade                          # apply after confirmation
[ -f /var/run/reboot-required ] && cat /var/run/reboot-required.pkgs
```

- **Automatic security updates**: the `unattended-upgrades` package, enabled
  with `sudo dpkg-reconfigure -plow unattended-upgrades`. Its default origin
  list is security updates only; leave it that way. Check what it did in
  `/var/log/unattended-upgrades/`.
- `needrestart` (installed by default on recent Ubuntu) lists services
  running old libraries after an upgrade; restart those or reboot.
- **Release upgrades** (Debian 12 → 13, Ubuntu LTS → LTS) are never
  unattended. Back up, read the release notes, have console access, do it
  when you have an evening free. These are High-tier changes.
- `apt full-upgrade` / `dist-upgrade` may remove packages to resolve
  dependencies; read the simulated output for the "will be REMOVED" list.

### Fedora, RHEL-family

```bash
sudo dnf check-update                     # read-only
sudo dnf upgrade --assumeno               # shows the transaction, then declines
sudo dnf upgrade                          # apply after confirmation
sudo needs-restarting -r                  # dnf-utils / dnf-plugins-core
```

`dnf-automatic` with `upgrade_type = security` is the unattended equivalent
(the timer and config file names vary by version; verify on the host).

### Proxmox and appliance OSes

Proxmox, TrueNAS, Unraid, OpenMediaVault and Home Assistant OS have their own
update channels and expectations. Use the vendor's update path (web UI or
documented CLI); running a plain distribution upgrade underneath an appliance
can break it. Read the vendor's release notes for each major version.

### Reboots

A kernel update is not applied until reboot. At home, a weekly maintenance
window the household knows about beats surprise reboots. After a reboot,
verify: every stack came back (`docker compose ls`, `docker ps --filter
health=unhealthy`), mounts are present (`findmnt`), the pool is healthy
(`nas-and-storage`).

## Containers

### Policy

- **No unattended auto-update for anything holding data.** Auto-updaters
  that pull and recreate containers on a schedule turn an upstream mistake
  into your outage at 04:00. Use notify-only tooling (for example Diun, or
  the "check for updates" feature of your container UI) and update by hand.
  Some once-popular auto-updaters are no longer maintained; check a tool's
  project status before adopting it (verify).
- **Read the release notes before every major or minor bump**, and before any
  update of a database image. Breaking changes are usually announced there
  and nowhere else.
- **One stack at a time**, verify, then the next.

### Procedure

```bash
cd /opt/stacks/photos

# 1. Capture what is running now (the rollback point)
docker compose images
docker image inspect --format '{{index .RepoDigests 0}}' \
  "$(docker compose images -q app)"
#   → ghcr.io/example/photo-app@sha256:3f1c… (write it into the journal)

# 2. Back up the stack's data first (references/service-backups.md)

# 3. Edit the tag in compose.yaml (2.4.1 → 2.5.0), then preview
docker compose config --quiet
docker compose pull app
docker compose --dry-run up -d

# 4. Apply after confirmation
docker compose up -d

# 5. Verify by observation
docker compose ps                    # healthy, not restarting
docker compose logs --since 5m app   # migrations finished, no error loop
#    … and use the app from a second device
```

Journal the before digest, after digest, the data backup path and the undo.

### Rollback

If the new version misbehaves and **has not migrated data**:

```bash
# Put the previous tag (or the recorded digest) back in compose.yaml
#   image: ghcr.io/example/photo-app@sha256:3f1c…
docker compose up -d
```

If it **has migrated the database or data files** (most apps say so in the
logs), rolling the image back alone may leave the old version unable to read
the new schema. Rollback is then: stop the stack, restore the data backup
taken in step 2, start the previous version. This is why the backup comes
before the update, not after.

### Database images

| Change | Safe in place? |
|---|---|
| Patch (`16.3` → `16.4`) | Usually yes; read notes |
| Major (`16` → `17`) for Postgres | No. Dump with the old version, start the new version on an empty data directory, restore; or follow `pg_upgrade` docs |
| MariaDB/MySQL major | Follow the project's upgrade notes; take a logical dump first |
| Redis/Valkey | Usually yes for cache use; persistence files may need care across majors |

Pin databases to a major version tag at minimum (`postgres:16`), better a
full version. An app's own compose example sometimes uses a floating tag;
change that before the first deploy.

## Update cadence that works at home

| What | How often |
|---|---|
| Host security updates | Automatic, daily |
| Host full upgrade + reboot | Weekly or fortnightly window |
| Container patch/minor updates | Monthly, or on a notification for something internet-facing |
| Container majors, databases | When you have time to read notes and test a restore |
| Release upgrade of the OS | When the old release nears end of support |

An internet-exposed service gets security updates promptly regardless of
cadence; everything else can wait for the window.
