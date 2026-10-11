# Setup and wiring

Every step here that writes to the host follows `safe-system-changes`
(plan, confirm, journal). Compose layout, image pinning, `.env` handling
and log limits follow `homelab-operations`; this file only adds what is
specific to a media stack.

## Bring-up order

1. **Storage and folders.** Create the data root and its subfolders, owned
   by the media user and group, on one filesystem
   (`architecture-and-layout.md`). Confirm with `df` and `stat` that they
   share a filesystem.
2. **Media server.** It works alone and proves the library path and
   playback before anything else is added.
3. **Download client** (if used), with categories that map to folders.
4. **Library managers**: Sonarr, Radarr, Lidarr. Connect each to the client
   and to the media server.
5. **Prowlarr** (if used), then add each manager as an application in it so
   it can sync indexer definitions. Which indexers the user adds is their
   business; do not suggest any.
6. **Bazarr** last, pointed at Sonarr and Radarr.

Bring each one up, verify it, journal it, then add the next.

## Compose skeleton (media-specific parts only)

Shown for orientation; put real image tags in place of `<tag>` and follow
`homelab-operations` for directory layout and `.env`.

```yaml
services:
  sonarr:
    image: lscr.io/linuxserver/sonarr:<tag>
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
      - TZ=${TZ}
      - UMASK=002            # verify the image still honours it
    volumes:
      - ./config:/config     # local disk, never a network share
      - ${DATA_ROOT}:/data   # the whole data root, same path everywhere
    ports:
      - "8989:8989"          # bind to a LAN address if the host is multi-homed
    restart: unless-stopped

  jellyfin:
    image: jellyfin/jellyfin:<tag>
    user: "${PUID}:${PGID}"
    volumes:
      - ./config:/config
      - ./cache:/cache
      - ${DATA_ROOT}/media:/data/media:ro
    devices:
      - /dev/dri:/dev/dri    # Intel/AMD hardware acceleration, if present
    ports:
      - "8096:8096"
    restart: unless-stopped
```

For Plex with `plexinc/pms-docker`: `PLEX_CLAIM` (a token from the user's
plex.tv account, valid for a few minutes only (verify); generate it just
before first start and never commit it), `PLEX_UID`/`PLEX_GID` and `TZ`
are first-run settings. Volumes are `/config`, `/transcode` and the media
path. Host networking is the simplest for local discovery; with bridge
networking set `ADVERTISE_IP`.

## Connecting the apps

All connections use the target app's API key (Settings, General, in each
*arr app) or the download client's credentials. Store keys only in the
apps and `.env`; in notes write `<radarr-api-key>`.

**Manager to download client** (Settings, Download Clients):

- Host: the client's container name on the shared Docker network (for
  example `qbittorrent`), not `localhost`. `localhost` inside a container
  is that container.
- Category: one per manager (`tv`, `films`, `music`) so imports do not
  cross.
- Test button must pass before saving.

**Download client settings that matter:**

- Default save path under `/data/torrents` (or `/data/usenet/complete`);
  category paths under it.
- Do not let the client move completed files into the library itself; the
  manager does that.
- Torrent clients: seeding limits are the user's decision. If the client
  removes torrents after seeding, hardlinked library files survive because
  the second link remains.

**Manager to media server** (Settings, Connect): add Plex or Jellyfin so
the manager triggers a rescan of the changed folder after import. For
Plex this uses a plex.tv sign-in; for Jellyfin an API key created in its
dashboard.

**Root folders** (Settings, Media Management): `/data/media/tv` for
Sonarr, `/data/media/films` for Radarr, `/data/media/music` for Lidarr.
Enable "Use Hardlinks instead of Copy" (the wording varies by version
(verify)).

**Naming:** pick a naming scheme that includes identifiers the media
server matches on (title and year for films, series title and episode
numbering for series). The media server's matching works best with one
folder per film or series.

## Importing an existing library

This is where data loss happens. Treat it as a bulk change.

1. Back up or snapshot the library first if storage allows, and the
   manager's `/config`.
2. Use the manager's Library Import (or "Import Existing") with renaming
   **off** for the first pass. Review the matches it proposes; fix
   mismatches by hand.
3. Preview renames (the manager shows a rename preview per item) on a small
   subset. Only then enable renaming for the rest, with the user's
   confirmation.
4. Leave "delete empty folders" and recycling-bin settings at their
   cautious values; set a recycle bin path so removed files are recoverable.
5. Rescan the media server and spot-check a dozen items for correct matches
   and watched state.

## Remote path mappings (last resort)

Use only when the download client runs on a different machine (for
example a NAS app) and a shared mount cannot give both sides the same path.
Map: host = the client's host as entered in the manager; remote path = the
path the client reports; local path = where the manager sees the same
folder. Wrong mappings fail silently until an import is attempted, so test
with one item and read the manager's log.

## Exposure

- Bind the *arr and client ports to the LAN only; reach them remotely over
  a VPN.
- If the media server is shared outside the home, prefer Plex's own remote
  access or a reverse proxy with TLS for Jellyfin, with strong passwords
  and no admin account used for everyday watching. Router port forwards
  change the household's attack surface: confirm with the user and journal.
