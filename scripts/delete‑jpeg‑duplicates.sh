#!/usr/bin/env bash
#
# delete‑jpeg‑duplicates.sh
#
# PURPOSE
#   For every immediate child directory of the folder in which this
#   script is executed, delete files whose names end in `-<number>.jpg`
#   *when* a file of the same name **without** the numeric suffix exists
#   in the same directory.
#
# SAFETY
#   1.  Runs a dry‑run first unless you pass --force.
#   2.  Uses `set -euo pipefail` and `shopt -s nullglob` for robustness.
#
# USAGE
#   ./delete‑jpeg‑duplicates.sh        # lists what would be deleted
#   ./delete‑jpeg‑duplicates.sh --force  # actually deletes
#

set -euo pipefail
shopt -s nullglob              # *.jpg expands to nothing instead of '*.jpg'
dry_run=true

if [[ "${1:-}" == "--force" ]]; then
  dry_run=false
fi

process_directory () {
  local dir="$1"
  echo "▶ Processing: $dir"

  # Enter the directory in a subshell so that we don't change PWD globally
  (
    cd "$dir"

    for f in *.jpg; do
      # Matches files like photo-1.jpg, image-23.jpg, etc.
      if [[ "$f" =~ ^(.*)-([0-9]+)\.jpg$ ]]; then
        base="${BASH_REMATCH[1]}.jpg"

        if [[ -f "$base" ]]; then
          if $dry_run; then
            echo "   ✧ Would delete duplicate: $f"
          else
            echo "   ✧ Deleting duplicate: $f"
            rm -- "$f"
          fi
        fi
      fi
    done
  )
}

# --------------------------------------------------------------------
# MAIN
# --------------------------------------------------------------------
echo "Running $(basename "$0") in $(pwd)"
$dry_run && echo "Dry‑run mode (no files deleted). Pass --force to delete."

for dir in */ ; do         # only immediate sub‑directories
  [[ -d "$dir" ]] && process_directory "$dir"
done

echo "Done."
