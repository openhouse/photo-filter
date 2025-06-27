#!/usr/bin/env bash
# tag_random_green.sh
#
# Randomly choose up to 10 images in the current directory
# and give each of them Finder’s green tag.
#
# ▸ Requirements
#   • macOS
#   • Homebrew package   :  brew install tag        # command‑line “Finder tags”
#   • (optional) shuf or gshuf (coreutils) – the script falls back to Perl if neither is present
#
# ▸ Usage
#   $ chmod +x tag_random_green.sh
#   $ cd /path/to/pictures
#   $ ./tag_random_green.sh
#
#   Run it again any time; previously tagged files are quietly re‑tagged,
#   and a fresh random set is chosen each run.

set -euo pipefail

#‑‑‑ 1. Verify that the `tag` CLI is available
if ! command -v tag >/dev/null 2>&1; then
  printf >&2 "❌  The ‘tag’ utility is missing.\n"
  printf >&2 "    Install it first:\n"
  printf >&2 "      brew install tag\n"
  exit 1
fi

#‑‑‑ 2. Gather *flat* list of image files (no recursion)
#     Add or remove extensions if your collection differs.
readarray -t IMAGES < <(
  find . -maxdepth 1 -type f \( \
        -iname '*.jpg'  -o -iname '*.jpeg' -o -iname '*.png'  -o -iname '*.gif' \
     -o -iname '*.tif'  -o -iname '*.tiff' -o -iname '*.heic' -o -iname '*.heif' \
  \) | sort
)

if [[ ${#IMAGES[@]} -eq 0 ]]; then
  echo "No image files found in $(pwd). Nothing to do."
  exit 0
fi

#‑‑‑ 3. Choose ≤10 of them at random
pick_random () {
  local want=$1
  if command -v shuf >/dev/null 2>&1; then               # GNU shuf
    printf '%s\n' "${IMAGES[@]}" | shuf -n "$want"
  elif command -v gshuf >/dev/null 2>&1; then            # coreutils on macOS
    printf '%s\n' "${IMAGES[@]}" | gshuf -n "$want"
  else                                                   # portable Perl fallback
    perl -MList::Util=shuffle -e '
      my $n = shift;
      chomp(my @l = <>);
      print "$_\n" for (shuffle(@l))[0 .. $n - 1 > $#l ? $#l : $n - 1];
    ' "$want" <<<"$(printf '%s\n' "${IMAGES[@]}")"
  fi
}

NUM=10
mapfile -t CHOSEN < <(pick_random "$NUM")

#‑‑‑ 4. Apply the Green Finder tag
for f in "${CHOSEN[@]}"; do
  # strip leading "./" for nicer display
  clean="${f#./}"
  tag --add Green "$clean"
done

echo "✅  Tagged ${#CHOSEN[@]} file(s) with the Green Finder tag:"
printf '   • %s\n' "${CHOSEN[@]}"
