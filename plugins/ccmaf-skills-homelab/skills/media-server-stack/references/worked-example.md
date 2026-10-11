# Worked example: "Sonarr isn't importing anything"

Fictional household, fictional host. The user collects public-domain
television series and films from an online archive that publishes official
torrents for its collection. qBittorrent downloads them, Sonarr and Radarr
organise them into the library, and Jellyfin serves it. The user also adds
their own off-air recordings through Sonarr's Manual Import.

## 1. Inventory (read-only)

```text
$ docker compose ps
NAME          IMAGE                                   STATUS
jellyfin      jellyfin/jellyfin:<tag>                 Up 3 days (healthy)
qbittorrent   lscr.io/linuxserver/qbittorrent:<tag>   Up 3 days
radarr        lscr.io/linuxserver/radarr:<tag>        Up 3 days
sonarr        lscr.io/linuxserver/sonarr:<tag>        Up 3 days
```

Sonarr's health list (via `/api/v3/health`, key read from `.env`, not
shown) reports: "Remote download client qBittorrent places downloads in
/downloads/tv but this directory does not appear to exist inside the
container."

## 2. Path map from reality

From `docker inspect -f '{{json .Mounts}}'` on each container:

| Service | Host path | Container path | uid:gid (from `id`) |
|---|---|---|---|
| qbittorrent | /mnt/pool/downloads | /downloads | 1000:1000 |
| sonarr | /mnt/pool/downloads | /data/downloads | 1000:1000 |
| sonarr | /mnt/pool/media/tv | /tv | 1000:1000 |
| radarr | /mnt/pool/downloads | /data/downloads | 1000:1000 |
| radarr | /mnt/pool/media/films | /films | 1000:1000 |
| jellyfin | /mnt/pool/media | /media | 1000:1000 |

Two problems are visible on the table:

1. qBittorrent reports `/downloads/...`; Sonarr sees the same folder as
   `/data/downloads/...`. Imports fail.
2. Even once paths agree, downloads and library are separate bind mounts in
   Sonarr, so every import would be a copy (`stat -c %d` shows the same
   device on the host, but the mounts are separate inside the container).

## 3. Plan presented to the user

> Proposed changes (nothing done yet):
>
> 1. Create `/mnt/pool/data` with `downloads/` and `media/` beneath it by
>    **moving** (renaming, same filesystem, instant) the two existing
>    folders. No files are copied or deleted. Undo: move them back.
> 2. Change mounts: qBittorrent `/mnt/pool/data/downloads:/data/downloads`;
>    Sonarr and Radarr `/mnt/pool/data:/data`; Jellyfin
>    `/mnt/pool/data/media:/data/media:ro`. Backup: copy of `compose.yaml`
>    as `compose.yaml.2026-10-11.bak`. Undo: restore that copy.
> 3. In qBittorrent, change the default save path to `/data/downloads`.
>    In Sonarr and Radarr, change root folders to `/data/media/tv` and
>    `/data/media/films` (the apps offer to update every series' path; this
>    changes database records, not files). Backup: each app's own backup
>    from System, Backup, taken first.
> 4. In Jellyfin, change library paths to `/data/media/...` and rescan.
>    Watched state is kept if items re-match (verify on a sample).
>
> Containers are down for about two minutes during step 2. Shall I go
> ahead, one step at a time?

The user approved steps 1 to 4.

## 4. Journal (extract)

Following `safe-system-changes` (`references/change-journal.md`):

```markdown
### 2026-10-11-01/02: Unify media stack mounts under /data

- Why: Sonarr imports failing; client and manager paths disagreed
- Target: /opt/stacks/media/compose.yaml
- Before: qbittorrent /downloads; sonarr /data/downloads + /tv; ...
- After: all services mount under /data (see path map v2)
- Backup: /opt/stacks/media/compose.yaml.2026-10-11.bak
- Command: edit compose.yaml; `docker compose up -d`
- Undo: restore backup; `docker compose up -d`
- Verify: Sonarr health list empty; test import hardlinked: PASS
```

## 5. Verification

- Sonarr and Radarr health lists: no messages.
- A test download of one public-domain episode imported in under a second;
  `stat -c '%h %i'` on source and library copy shows link count 2 and the
  same inode.
- Jellyfin rescanned; twelve sampled items matched, watched state intact.
- `docker compose exec qbittorrent ls /data/downloads` and the same in
  Sonarr list identical contents.

## 6. What the assistant did not do

- It did not move or rename media files beyond the two folder renames the
  user approved.
- It did not remove the previous compose file.
- When the user asked in passing which public trackers carry old films,
  the assistant said that recommending sources is outside what it helps
  with, pointed to the public-domain collections the user already used,
  and returned to the import fix.
