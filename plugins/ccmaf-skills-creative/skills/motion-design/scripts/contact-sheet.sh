#!/usr/bin/env bash
# contact-sheet.sh — review views and exports for a rendered frame sequence.
#
# Usage:
#   contact-sheet.sh sheet  [frames_dir=out/frames] [every=12] [cols=4] [rows=3]
#   contact-sheet.sh onion  [frames_dir] <first> <last>   # stacked low-opacity frames
#   contact-sheet.sh mp4    [frames_dir] [fps=24]
#   contact-sheet.sh gif    [frames_dir] [fps=24] [width=1200]
#   contact-sheet.sh loop   [video=out/anim.mp4]          # 3 loops back to back
#   contact-sheet.sh sideby <a.png> <b.png>               # two frames side by side
set -euo pipefail

cmd="${1:-sheet}"; shift || true
mkdir -p out

case "$cmd" in
  sheet)
    dir="${1:-out/frames}"; every="${2:-12}"; cols="${3:-4}"; rows="${4:-3}"
    ffmpeg -y -v error -framerate 24 -i "$dir/%04d.png" \
      -vf "select='not(mod(n\,${every}))',scale=400:-1,drawtext=text='f %{eif\\:n*${every}\\:d}':x=8:y=8:fontcolor=white:box=1:boxcolor=black@0.6:fontsize=18,tile=${cols}x${rows}" \
      -frames:v 1 out/contact.png 2>/dev/null \
    || ffmpeg -y -v error -framerate 24 -i "$dir/%04d.png" \
      -vf "select='not(mod(n\,${every}))',scale=400:-1,tile=${cols}x${rows}" -frames:v 1 out/contact.png
    echo "out/contact.png (every ${every}th frame, ${cols}x${rows})" ;;
  onion)
    dir="${1:-out/frames}"; first="${2:?first frame}"; last="${3:?last frame}"
    count=$((last - first + 1))
    ffmpeg -y -v error -start_number "$first" -framerate 24 -i "$dir/%04d.png" -frames:v "$count" \
      -vf "tmix=frames=${count}" -update 1 out/onion.png
    echo "out/onion.png (average of frames ${first}-${last}; even spacing = robotic, tightening near keys = eased)" ;;
  mp4)
    dir="${1:-out/frames}"; fps="${2:-24}"
    ffmpeg -y -v error -framerate "$fps" -i "$dir/%04d.png" -c:v libx264 -profile:v high \
      -pix_fmt yuv420p -crf 18 -movflags +faststart out/anim.mp4
    echo "out/anim.mp4" ;;
  gif)
    dir="${1:-out/frames}"; fps="${2:-24}"; width="${3:-1200}"
    # One palette for the whole clip (stats_mode=diff) avoids colour flicker between frames.
    ffmpeg -y -v error -framerate "$fps" -i "$dir/%04d.png" \
      -vf "scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
      -loop 0 out/anim.gif
    echo "out/anim.gif — check frame delays if fps doesn't divide 100 (see loops-and-export.md)" ;;
  loop)
    video="${1:-out/anim.mp4}"
    ffmpeg -y -v error -stream_loop 2 -i "$video" -c copy out/loop_check.mp4
    echo "out/loop_check.mp4 — watch both seams" ;;
  sideby)
    a="${1:?frame a}"; b="${2:?frame b}"
    ffmpeg -y -v error -i "$a" -i "$b" -filter_complex hstack out/sideby.png
    echo "out/sideby.png" ;;
  *) echo "unknown command: $cmd" >&2; exit 2 ;;
esac
