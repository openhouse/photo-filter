#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1) ensure venv
if [[ ! -x "$ROOT_DIR/backend/venv/bin/python3" ]]; then
  echo "[bootstrap] creating backend/venv"
  python3 -m venv "$ROOT_DIR/backend/venv"
fi

# 2) install osxphotos fork in venv
echo "[bootstrap] installing osxphotos (and pip upgrade)"
OSXPHOTOS_FORK_SPEC="git+https://github.com/openhouse/osxphotos.git@0a9f561#egg=osxphotos"
"$ROOT_DIR/backend/venv/bin/python3" -m pip install -U pip
"$ROOT_DIR/backend/venv/bin/python3" -m pip install -U --force-reinstall "${OSXPHOTOS_FORK_SPEC}"
"$ROOT_DIR/backend/venv/bin/python3" - <<'PY'
from osxphotos import __version__ as v
print(f"[bootstrap] osxphotos version installed: {v}")
PY

# 3) build filename index with default JPEG normalization
echo "[bootstrap] building filename index"
JPEG_EXT="${JPEG_EXT:-jpg}" npm run build:filename-index

echo "[bootstrap] done"
