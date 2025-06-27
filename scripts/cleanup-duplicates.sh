#!/usr/bin/env bash

# This script will find files ending in -<number>.jpg and remove them
# only if a corresponding file without that trailing -<number> exists.

for f in *.jpg; do
  # Check if the file ends with a dash followed by one or more digits before ".jpg"
  # Example: filename-1.jpg, filename-2.jpg
  if [[ "$f" =~ ^(.*)-([0-9]+)\.jpg$ ]]; then
    base="${BASH_REMATCH[1]}.jpg"  # Reconstruct what the original file's name should be
    if [ -f "$base" ]; then
      echo "Deleting duplicate: $f"
      rm "$f"
    fi
  fi
done
