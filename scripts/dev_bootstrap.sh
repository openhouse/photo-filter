#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1) ensure venv
if [[ ! -x "$ROOT_DIR/backend/venv/bin/python3" ]]; then
  echo "[bootstrap] creating backend/venv"
  python3 -m venv "$ROOT_DIR/backend/venv"
fi

# 2) ensure osxphotos in venv
echo "[bootstrap] installing osxphotos (and pip upgrade)"
"$ROOT_DIR/backend/venv/bin/pip" install --upgrade pip osxphotos

# 3) build filename index with venv python
echo "[bootstrap] building filename index"
"$ROOT_DIR/backend/venv/bin/python3" "$ROOT_DIR/scripts/build_filename_index.py" \
  --output "$ROOT_DIR/backend/data/library/filename-index.json" || true

echo "[bootstrap] done"
