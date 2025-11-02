#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:3000"
FILES=(
  "20100208T174405000000Z-005_3A.jpg"
  "20221201T174242329834Z-IMG_5899.jpg"
)

if [[ $# -gt 0 ]]; then
  if [[ "$1" == http://* || "$1" == https://* ]]; then
    BASE_URL="$1"
    shift
  fi
  if [[ $# -gt 0 ]]; then
    FILES=()
    while [[ $# -gt 0 ]]; do
      FILES+=("$1")
      shift
    done
  fi
fi

cleanup() {
  [[ -n "${TMP_HEADERS:-}" && -f "$TMP_HEADERS" ]] && rm -f "$TMP_HEADERS"
  [[ -n "${TMP_BODY:-}" && -f "$TMP_BODY" ]] && rm -f "$TMP_BODY"
}
trap cleanup EXIT

for FILE in "${FILES[@]}"; do
  ENC="$(printf '%s' "$FILE" | jq -sRr @uri)"
  for URL in \
    "${BASE_URL}/api/people/by-filename/${ENC}" \
    "${BASE_URL}/api/people/by-filename?filename=${ENC}"; do
    echo "→ GET ${URL}"
    TMP_HEADERS="$(mktemp)"
    TMP_BODY="$(mktemp)"
    curl -sS -H 'Accept: application/json' -D "$TMP_HEADERS" "$URL" -o "$TMP_BODY" || true
    STATUS_LINE="$(head -n 1 "$TMP_HEADERS")"
    echo "  ${STATUS_LINE}"
    sed 's/^/  /' "$TMP_HEADERS" | tail -n +2
    jq . "$TMP_BODY" | sed 's/^/  /'
    echo
    rm -f "$TMP_HEADERS" "$TMP_BODY"
    TMP_HEADERS=""
    TMP_BODY=""
  done
done
