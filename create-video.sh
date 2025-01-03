#!/usr/bin/env bash
#
# create-video.sh
#
# After running "sh cleanup-duplicates.sh" on a directory of images,
# invoke this script to generate a single .mov video file from all .jpg images.
#
# Usage:
#   sh create-video.sh [directory-of-jpg-images]
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

set -e  # Exit immediately if a command exits with a non-zero status

# 1. Handle optional directory argument or default to current directory
IMAGES_DIR="${1:-$(pwd)}"

# Sanity check: does the directory exist?
if [ ! -d "$IMAGES_DIR" ]; then
  echo "Error: '$IMAGES_DIR' is not a directory or does not exist."
  exit 1
fi

cd "$IMAGES_DIR"
echo "Working in directory: $IMAGES_DIR"

# 2. Ensure all images have the correct orientation
echo "1) Ensuring all .jpg images have correct orientation..."
mogrify -auto-orient *.jpg || {
  echo "No .jpg files found or mogrify command failed."
  exit 1
}

# 3. Generate a file list of .jpg images
echo "2) Generating file_list.txt for ffmpeg..."
ls -1 *.jpg > file_list.txt

# 4. Convert file_list.txt into ffmpeg's concat format
echo "   Converting list to ffmpeg concat format -> formatted_list.txt"
awk '{print "file \x27" $0 "\x27"}' file_list.txt > formatted_list.txt

# 5. Determine the dimensions of the first .jpg via ffprobe
echo "3) Detecting reference dimensions using ffprobe on the first .jpg..."
FIRST_IMAGE=$(head -n 1 file_list.txt)
if [ -z "$FIRST_IMAGE" ]; then
  echo "No .jpg files found in $IMAGES_DIR. Exiting."
  exit 1
fi

DIMENSIONS=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$FIRST_IMAGE")
if [ -z "$DIMENSIONS" ]; then
  echo "Could not determine dimensions from '$FIRST_IMAGE' via ffprobe."
  exit 1
fi

WIDTH=$(echo "$DIMENSIONS" | cut -d ',' -f1)
HEIGHT=$(echo "$DIMENSIONS" | cut -d ',' -f2)
echo "   Found dimensions: $WIDTH x $HEIGHT"

# 6. Create a video using ffmpeg with scale & pad to preserve aspect ratio
#    -framerate is set to 16, but you can change it to your preference
OUTPUT_FILE="output_preserved_aspect.mov"
echo "4) Creating ProRes video ($OUTPUT_FILE) with preserved aspect ratio..."
ffmpeg \
  -f concat -safe 0 \
  -i formatted_list.txt \
  -vf "scale='min(iw*${HEIGHT}/ih,${WIDTH})':${HEIGHT},setsar=1,pad=${WIDTH}:${HEIGHT}:(${WIDTH}-iw)/2:(${HEIGHT}-ih)/2" \
  -framerate 16 \
  -c:v prores \
  -pix_fmt yuv422p \
  "$OUTPUT_FILE"

echo "Done! Created video: $OUTPUT_FILE"
echo "You can now import '$OUTPUT_FILE' into Final Cut Pro or your preferred editor."
