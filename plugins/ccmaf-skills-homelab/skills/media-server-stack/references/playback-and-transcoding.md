# Playback, transcoding and libraries

## Direct play first

The media server sends the file unchanged when the client supports the
container, video codec, audio codec and subtitle format, and the bitrate
fits the connection. Anything else forces work:

| Mode | What happens | Cost |
|---|---|---|
| Direct play | File sent as is | Almost none |
| Direct stream / remux | Container changed, streams copied | Low |
| Audio transcode | Video copied, audio re-encoded | Low to moderate |
| Video transcode | Video decoded and re-encoded | High; needs hardware acceleration for more than one or two streams |

Before tuning the server, find out **why** a stream transcodes. Plex's
dashboard and Jellyfin's activity/playback info show the reason. Common
reasons, cheapest fix first:

1. **Client quality setting** set below the file's bitrate (often the
   default on mobile and remote). Raise it on the client.
2. **Image-based subtitles** (PGS, VobSub) burned in because the client
   cannot render them. Use a text subtitle (SRT) or a client that renders
   them.
3. **Unsupported audio** (for example a lossless surround track on a TV
   app). An audio-only transcode is cheap; adding a compatible audio track
   to the file is a library change and needs confirmation.
4. **Unsupported video codec** on an older client (HEVC, AV1, 10-bit). A
   newer client app or device is often cheaper than transcoding hardware.
5. **Bandwidth** for remote viewers. Upload speed at home caps every
   remote stream.

## Hardware acceleration

| Hardware | Plex | Jellyfin | Container requirement |
|---|---|---|---|
| Intel iGPU (Quick Sync) | Yes, with Plex Pass (verify current terms) | Yes (QSV or VA-API) | Pass `/dev/dri`; container user in the group that owns `/dev/dri/renderD128` |
| AMD GPU/APU | Partial (verify) | Yes (VA-API) | Pass `/dev/dri` |
| NVIDIA GPU | Yes, with Plex Pass | Yes (NVENC) | NVIDIA driver plus the NVIDIA Container Toolkit; `runtime: nvidia` or a GPU device reservation in Compose |
| Raspberry Pi | Limited; software only on recent models (verify) | Limited (verify) | Not recommended as a transcoding server |

Steps (read-only checks before any change):

1. On the host, confirm the device exists: `ls -l /dev/dri` should list
   `card0` and `renderD128` (numbers vary). Note the group (`render` or
   `video`) and its GID: `getent group render`.
2. Pass the device into the container (`devices: - /dev/dri:/dev/dri`) and
   add the group (`group_add: - "<render-gid>"`) when the container runs as
   a non-root user.
3. Enable it in the app: Plex, Settings, Transcoder, "Use hardware
   acceleration when available"; Jellyfin, Dashboard, Playback,
   Transcoding, choose the method (QSV or VA-API for Intel, VA-API for AMD,
   NVENC for NVIDIA) and tick the codecs the hardware supports.
4. Verify with a forced transcode (lower the client quality): Plex shows
   "(hw)" next to the transcode in the dashboard; Jellyfin's transcode log
   (in its log folder) shows the hardware decoder and encoder in the ffmpeg
   command line. Host CPU should stay low.

Tick only codecs the hardware supports. Enabling decoding for an
unsupported codec makes playback fail rather than fall back cleanly in some
versions (verify).

## Transcode temporary files

- Point the transcode directory at fast local storage (or RAM, for example
  a `tmpfs` mount of a few gigabytes) rather than the media pool.
- A full transcode directory stops all transcodes; it appears as playback
  that starts then fails. Check free space there first.

## Library scanning and matching

- One folder per film (`Title (Year)/Title (Year).mkv`) and per series
  (`Series (Year)/Season 01/...`) gives the most reliable matches in both
  servers. The managers' naming settings can produce this.
- Library type matters: a film library will not match series files.
- If files appear in the managers but not the media server: check the
  media server's container can see the path (`docker compose exec jellyfin
  ls /data/media/films`), that the Connect notification is configured, then
  run a scan of that one library.
- Inotify watching across bind mounts and network shares is unreliable;
  scheduled scans plus manager notifications are the dependable pair.
- Metadata agents fetch from online databases; the server needs outbound
  internet. A blocked DNS or firewall shows as "unmatched" everything.

## Remote access

- Plex: the server's Remote Access page reports whether it is reachable.
  Plex has changed which remote playback features need a paid pass (verify
  the current terms before advising the household).
- Jellyfin: no relay service; remote access needs a VPN (simplest and
  safest), or a reverse proxy with TLS and a domain. Configure the
  "known proxies" setting when behind a proxy so client addresses are
  correct (verify the setting name for the version).
- Either way, confirm before opening a router port and journal it.
