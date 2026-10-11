# Common failures

Symptom, likely cause, how to confirm (read-only), then the fix. Every fix
that changes something goes through `safe-system-changes`: state it, get
confirmation, journal it, verify.

## Imports

**Download finished, never imported; manager log says the path does not
exist.**
Cause: client and manager mount the folder at different container paths.
Confirm: the path in the log; `ls` it inside the manager's container.
Fix: give both the same mount under one data root
(`architecture-and-layout.md`). Remote path mapping only if the client is on
another machine.

**Import works but takes minutes and disk use doubles.**
Cause: copy instead of hardlink, because downloads and library are on
different filesystems or different bind mounts.
Confirm: `stat -c '%h %i'` on both copies (link count 1, different inodes);
`stat -c %d` on both folders (different devices).
Fix: one bind mount for the whole data root in the manager; one
filesystem on the host. Existing duplicates can be deduplicated later, as
a separate, previewed, confirmed change.

**"Access denied" / "unable to move" in the manager log.**
Cause: file owned by another user (root from a manual copy, or a container
without PUID/PGID), or a umask that drops group write.
Confirm: `ls -ln` on the file; `docker compose exec <svc> id`.
Fix: align PUID/PGID and umask across containers; chown the affected paths
after a counted preview.

**Imported to the wrong title, or "unknown series/film".**
Cause: release name does not match; folder naming ambiguous; wrong item
picked during library import.
Confirm: manager's history and the manual import screen.
Fix: manual import with the right match; correct the item's mapping. Do
not bulk-rename until matches are right.

**Files imported but the manager then deleted something.**
Cause: an upgrade replaced a lower-quality file, or removal with "delete
files" ticked, or "delete empty folders".
Confirm: manager history and log; recycle bin folder if configured.
Fix: restore from the recycle bin or backup. Set a recycle bin path so
this is recoverable next time.

## Connectivity

**Manager: "download client unavailable".**
Cause: host set to `localhost` (which is the manager's own container),
wrong port, client down, client's auth changed, or the client routes
through a VPN container that is down or does not publish the web UI port.
Confirm: `docker compose ps`; from the manager container, `curl -sS
http://qbittorrent:8080` (expect an HTTP response, not a timeout).
Fix: use the container name on a shared network; publish the port on the
VPN container if the client shares its network.

**Prowlarr apps fail to sync.**
Cause: wrong manager URL or API key in Prowlarr's Apps settings, or the
manager's URL base changed.
Confirm: Prowlarr's System, Status and log; the manager's own key.
Fix: correct the URL (container name and port) and key.

**Web UI unreachable after an update.**
Cause: container restarting (check logs), port clash (qBittorrent and
SABnzbd both default to 8080), or the app now requires authentication
and a reverse proxy strips headers.
Confirm: `docker compose logs --tail 100 <svc>`; `ss -ltnp | grep <port>`
on the host.
Fix: resolve the clash in compose; set up authentication in the app.

## Databases and config

**"database disk image is malformed" / app will not start after a crash.**
Cause: SQLite corruption, most often from config on a network share, a
full disk or an unclean shutdown.
Confirm: log on start-up; free space on the config disk; where `/config`
lives.
Fix: stop the app, keep a copy of the damaged database, restore the app's
own scheduled backup (each *arr app keeps backups in its config folder;
verify the location for the version). Move config to local disk.
Repairing SQLite by hand is a last resort and needs the user's agreement.

**Settings lost after recreating a container.**
Cause: `/config` not mounted, or mounted at a different host path.
Fix: correct the mount and restore config from backup
(`homelab-operations`).

## Media server

**Plex server not found / cannot be claimed.**
Cause: claim token expired (they last only minutes), the server cannot
reach plex.tv (DNS, firewall), or bridge networking without
`ADVERTISE_IP`.
Fix: new token immediately before first start; check outbound DNS from the
container; consider host networking.

**Library empty or items missing.**
Cause: the media server's container does not mount the path; wrong
library type; naming the scanner cannot match; no outbound internet for
metadata.
Confirm: `ls` the library path inside the media server's container.
Fix: correct the mount, the library type or the naming; rescan one
library.

**Buffering or "server not powerful enough".**
Cause: a video transcode the CPU cannot keep up with, a full transcode
directory, slow storage or Wi-Fi, low upload bandwidth for remote users.
Confirm: dashboard or activity view shows the transcode reason and
whether hardware is in use; free space in the transcode directory.
Fix: `playback-and-transcoding.md`, in order: client settings, subtitles,
audio, then hardware acceleration.

**Hardware transcoding enabled but CPU still maxed.**
Cause: `/dev/dri` not passed, container user not in the render group,
codec not supported by the hardware, or (Plex) no active Plex Pass.
Confirm: `docker compose exec <svc> ls -l /dev/dri`; the transcode log.
Fix: pass the device, add the group, tick only supported codecs.

## Downloads that look wrong

**A download contains an executable, a shortcut, a password-protected
archive, or a "codec pack" instead of a video.**
Treat as malware. Do not open or extract it. Tell the user, remove it from
the client only with their confirmation, and check the host with its
security tooling. It is untrusted input (`untrusted-input-handling`).

**Questions about where to get content.**
Out of scope (see the lawful-use rule in `SKILL.md`). Say so in one
sentence and carry on with the technical question if there is one.
