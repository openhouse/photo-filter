#!/usr/bin/env bash
#
# img-meta-dump.sh
#
# Usage:
#   ./img-meta-dump.sh /path/to/image.jpg
#
# What it does:
#   1. Validates the argument.
#   2. Shows low-level file info (`stat`).
#   3. Shows Spotlight metadata (`mdls`).
#   4. Shows any extended attributes (`xattr`).
#   5. If `exiftool` is available, prints *all* tag groups,
#      including maker notes, IPTC, XMP, GPS, etc.
#
# Inspiration: clarity, completeness, and kindness to future-you.

set -euo pipefail

### 1 · Validate input ##########################################################
if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <path-to-image-file>" >&2
  exit 64   # EX_USAGE
fi

FILE="$1"

if [[ ! -f "$FILE" ]]; then
  echo "Error: '$FILE' is not a file (or does not exist)." >&2
  exit 66   # EX_NOINPUT
fi

### 2 · Basic file information ##################################################
echo "===== BASIC FILE INFO ===================================================="
# -f = custom format string; see `man stat` on macOS
stat -f "Path: %N
Size: %z bytes
Permissions: %Sp
Owner: %Su:%Sg
Created: %SB
Modified: %Sm
------------------" "$FILE"

### 3 · Spotlight (mdls) metadata ##############################################
echo "===== SPOTLIGHT METADATA (mdls) =========================================="
mdls "$FILE" || echo "(No Spotlight metadata)"

### 4 · Extended attributes (xattr) ############################################
echo "===== EXTENDED ATTRIBUTES (xattr -l) ====================================="
# `xattr -l` prints name:value pairs; suppress header if none found
if xattr -p com.apple.metadata:kMDItemFSName "$FILE" >/dev/null 2>&1; then
  xattr -l "$FILE"
else
  echo "(No extended attributes)"
fi

### 5 · Deep dive with exiftool (if present) ###################################
if command -v exiftool >/dev/null 2>&1; then
  echo "===== EXIF/IPTC/XMP & MAKER NOTES (exiftool) ============================="
  # -a = allow duplicate tags, -u = unknown tags, -g1 = group names at level 1
  exiftool -a -u -g1 "$FILE"
else
  echo "===== exiftool NOT INSTALLED ============================================="
  echo "For the richest possible metadata dump, install Phil Harvey's exiftool:"
  echo "    brew install exiftool"
  echo "and re-run this script."
fi
