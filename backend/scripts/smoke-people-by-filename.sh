#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <exported-filename>" >&2
  exit 1
fi

FILENAME="$1"
ENCODED=$(python3 - <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
"$FILENAME")

BASE_URL=${PF_API_HOST:-${PF_API_BASE:-http://localhost:${PORT:-3000}}}

curl_and_assert() {
  local url="$1"
  local label="$2"
  echo "\n>>> $label: $url"
  local body_file
  local header_file
  body_file=$(mktemp)
  header_file=$(mktemp)
  local status
  status=$(curl -sS -o "$body_file" -D "$header_file" "$url" -w "%{http_code}")
  if [[ "$status" != "200" ]]; then
    echo "Request failed with status $status" >&2
    echo "Response body:" >&2
    cat "$body_file" >&2
    exit 1
  fi
  local resolve
  resolve=$(grep -i "^X-PF-Resolve:" "$header_file" | awk '{print $2}' | tr -d '\r')
  echo "Status: $status"
  echo "X-PF-Resolve: ${resolve:-<missing>}"
  echo "Body:"
  cat "$body_file"
  rm -f "$body_file" "$header_file"
}

curl_and_assert "$BASE_URL/api/people/by-filename/$ENCODED" "Path variant"
curl_and_assert "$BASE_URL/api/people/by-filename?filename=$ENCODED" "Query variant"
