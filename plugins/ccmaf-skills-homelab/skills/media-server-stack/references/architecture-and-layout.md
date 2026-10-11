# Architecture and folder layout

## Component roles

| Component | Job | Default web port | Notes |
|---|---|---|---|
| Plex Media Server | Streams the library to clients, transcodes when needed | 32400/tcp | Account sign-in via plex.tv; some features need Plex Pass (optional, paid) |
| Jellyfin | Same job, free and open source | 8096/tcp (HTTP), 8920/tcp (HTTPS, if enabled), 7359/udp (client discovery) | No account service; users are local |
| Sonarr | Series library manager: monitors, renames, imports | 8989 | API v3 |
| Radarr | Film library manager | 7878 | API v3 |
| Lidarr | Music library manager | 8686 | API v1 (verify) |
| Prowlarr | Manages indexer definitions centrally for the other *arr apps | 9696 | API v1. This skill configures the app; it never recommends indexers |
| Bazarr | Subtitle manager for Sonarr and Radarr libraries | 6767 | Reads paths from Sonarr/Radarr, so the same path rules apply |
| qBittorrent | Torrent client | 8080 in the LinuxServer image (`WEBUI_PORT`) | WebUI API v2 |
| Transmission | Torrent client | 9091 | RPC API |
| SABnzbd | Usenet client | 8080 (LinuxServer image) (verify) | Clashes with qBittorrent's default; change one |
| NZBGet | Usenet client | 6789 | |

Readarr (books) was retired in 2025 and its repository archived. For an
existing install, keep it running read-only if the user wishes, but do not
build new setups on it.

Ports are defaults; the user's compose file or app settings win. Record the
real values in the path map.

## How the pieces talk

```text
           API key                      API key
 Prowlarr ---------> Sonarr / Radarr / Lidarr ---------> download client
                          |   ^                               |
                          |   | "download complete at <path>" |
                          |   +-------------------------------+
                          | import: hardlink or move into /data/media
                          v
                   media server library scan (Plex / Jellyfin)
```

- The managers hold the download client's address and credentials, and ask
  it what has finished and where.
- The client reports a **path as it sees it**. The manager then opens that
  path **as it sees it**. If the two containers mount the folder at
  different paths, the import fails. This single fact explains most import
  problems.
- The managers can notify the media server to rescan a folder after import
  (Connect settings). Without that, the media server picks changes up on its
  own schedule or file watcher.

## The shared data root

One host directory holds downloads and library together, on one filesystem,
mounted at the same container path in every service that touches files.

```text
/srv/data                  (host)  ->  /data   (every container)
  torrents/
    tv/  films/  music/            download client categories
  usenet/
    incomplete/
    complete/
      tv/  films/  music/
  media/
    tv/  films/  music/            library root folders
```

Container mounts:

| Service | Mount | Why |
|---|---|---|
| Download client | `/srv/data/torrents:/data/torrents` (or `usenet`) | Sees only downloads, at the same path the managers use |
| Sonarr, Radarr, Lidarr | `/srv/data:/data` | Sees both downloads and library, so it can hardlink or move |
| Plex or Jellyfin | `/srv/data/media:/data/media` (read-only is fine: `:ro`) | Sees only the library |
| Bazarr | `/srv/data/media:/data/media` | Writes subtitle files beside media |

Names are examples; the rule is identical container paths for identical
host paths, and one filesystem under the root.

## Hardlinks and atomic moves

- A **hardlink** is a second directory entry for the same file. A torrent
  can keep seeding from `torrents/tv/` while the library sees the same bytes
  in `media/tv/`, with no extra space. Hardlinks only work **within one
  filesystem** and, inside containers, **within one bind mount**.
- An **atomic move** (rename) is instant on the same filesystem; across
  filesystems it becomes copy then delete.
- Check: `stat -c '%h %i' <file>` shows the link count and inode. After an
  import with hardlinks, the download and the library file share an inode
  and show a count of 2.
- ZFS datasets, Btrfs subvolumes, separate disks and `mergerfs` pools each
  have their own rules: two ZFS datasets are two filesystems (no hardlinks
  between them); mergerfs supports hardlinks only within one branch unless
  configured otherwise (verify against the mergerfs docs and the user's
  policy). Storage design belongs to `nas-and-storage`.
- Hardlinks do not work over SMB in the usual home setups; if the managers
  reach the library over a share, expect copies.

## PUID, PGID and umask

- LinuxServer.io images run the app as the user given by `PUID` and `PGID`.
  Find the values with `id <username>` on the host and use the same pair for
  every container that writes to `/data`.
- Jellyfin's official image and Plex's `plexinc/pms-docker` use their own
  mechanisms (`user:` in Compose for Jellyfin; `PLEX_UID`/`PLEX_GID` for
  Plex, first-run only). Read the image's documentation for the version in
  use.
- A group-writable umask (`002`) means files created by one app can be
  renamed by another in the same group. LinuxServer images have accepted a
  `UMASK` variable (verify for the image in use).
- Fixing ownership on an existing library is a bulk change: preview with
  `find /srv/data ! -user <uid> | head`, count first, journal, then `chown`
  only the paths agreed.

## Where config lives

- Each app's `/config` volume holds its database (SQLite), logs, API key
  and settings. Keep it on local SSD or disk, never on a network share.
- Plex metadata can grow to tens of gigabytes for large libraries; give it
  space and keep it off the media pool if that pool is slow.
- Backing up `/config` (with the app stopped, or using the app's own backup
  feature) is `homelab-operations`' job; this skill only tells you where it
  is and that it matters.

## The path map (write this down)

| Service | Image and tag | Host path | Container path | PUID:PGID | Port |
|---|---|---|---|---|---|
| sonarr | lscr.io/linuxserver/sonarr:<tag> | /srv/data | /data | 1000:1000 | 8989 |
| qbittorrent | lscr.io/linuxserver/qbittorrent:<tag> | /srv/data/torrents | /data/torrents | 1000:1000 | 8080 |
| jellyfin | jellyfin/jellyfin:<tag> | /srv/data/media | /data/media (ro) | 1000:1000 | 8096 |

Keep it in the workspace next to the journal. Every diagnosis starts by
checking reality against it.
