#!/usr/bin/env bash
#
# create-video.sh  ── build a ProRes (or other) movie from a folder of JPEGs
#
# Usage:
#   ./create-video.sh [-b COLOR] [-r FPS] [-s] [directory]
#
# Options:
#   -b COLOR   Padding colour; use "transparent" for alpha padding (default).
#              Any ImageMagick/ffmpeg colour value works, e.g. "#112233", "white".
#   -r FPS     Frames per second (default: 16).
#   -s         Skip the mogrify orientation step.
#
# If no directory is provided, the script will default to the current directory.
#
# Prerequisites (already installed on your system per the assumption):
#   - ImageMagick (for mogrify)
#   - ffmpeg and ffprobe
#
# Script Steps:
#   1. Move into the target directory
#   2. Reorient all .jpg images
#   3. Create file listing for ffmpeg
#   4. Convert listing to ffmpeg concat format
#   5. Extract image dimensions via ffprobe from the first .jpg
#   6. Run ffmpeg with scale & pad to preserve aspect ratio
#   7. Output a ProRes .mov (yuv422p) at 16 fps, ready for editing

set -euo pipefail
IFS=$'\n\t'

BG_COLOR="transparent"
FPS=16
SKIP_MOGRIFY=0

# Parse options
while getopts ":b:r:hs" opt; do
  case "$opt" in
    b) BG_COLOR="$OPTARG" ;;
    r) FPS="$OPTARG"      ;;
    s) SKIP_MOGRIFY=1      ;;
    h)
      echo "Usage: $0 [-b COLOR] [-r FPS] [-s] [directory]"
      exit 0
      ;;
    *)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
  esac
done
shift $((OPTIND - 1))

# 1. Handle optional directory argument or default to current directory
IMAGES_DIR="${1:-$(pwd)}"
cd "$IMAGES_DIR" || { echo "Directory not found: $IMAGES_DIR"; exit 1; }
echo "\u25B6 Working in: $IMAGES_DIR"

# 2. Ensure all images have the correct orientation
shopt -s nullglob
jpgs=(*.jpg *.jpeg *.JPG *.JPEG)
if (( ${#jpgs[@]} == 0 )); then
  echo "No JPEGs found – aborting."; exit 1
fi
if [[ $SKIP_MOGRIFY -eq 0 ]]; then
  echo "\u25B6 Auto-orienting JPEGs\u2026"
  mogrify -monitor -auto-orient "${jpgs[@]}"
else
  echo "\u25B6 Skipping mogrify orientation step"
fi

# 3. Generate a file list of .jpg images
echo "\u25B6 Building concat list…"
printf "file '%s'\n" "${jpgs[@]}" > formatted_list.txt

# 5. Determine the dimensions of the first .jpg via ffprobe
# ffprobe outputs width and height separated by a comma. Temporarily set IFS
# to comma so both values are parsed correctly, then restore the original IFS
# (newline/tab) used for handling filenames.
OLD_IFS=$IFS
IFS=',' read WIDTH HEIGHT < <(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0 "${jpgs[0]}")
IFS=$OLD_IFS

echo "   Reference size: ${WIDTH}×${HEIGHT}"

OUTPUT="output_preserved_aspect.mov"
echo "\u25B6 Encoding → $OUTPUT"

if [[ "$BG_COLOR" == "transparent" ]]; then
  PAD_COLOR="black@0"                               # fully transparent
  CODEC=(-c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le) # ProRes 4444
  FILTER="format=rgba,\
scale='if(gt(a,${WIDTH}/${HEIGHT}),${WIDTH},-2)':'if(gt(a,${WIDTH}/${HEIGHT}),-2,${HEIGHT})',\
pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR},\
format=yuva444p10le"
else
  PAD_COLOR="$BG_COLOR"
  CODEC=(-c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le)  # ProRes 422 HQ
  FILTER="scale='if(gt(a,${WIDTH}/${HEIGHT}),${WIDTH},-2)':'if(gt(a,${WIDTH}/${HEIGHT}),-2,${HEIGHT})',\
pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}"
fi

# Use the same frame rate for input and output to avoid dropped frames
ffmpeg -hide_banner -y \
  -framerate "$FPS" -f concat -safe 0 -i formatted_list.txt \
  -vf "$FILTER" \
  -r "$FPS" -fps_mode cfr \
  "${CODEC[@]}" \
  "$OUTPUT"

echo "\u2705 Done.  Created $OUTPUT"
[[ "$BG_COLOR" == "transparent" ]] && \
  echo "   → In Final Cut set Clip Inspector \u25B8 Alpha Handling \u25B8 Straight/Premultiplied."
