#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[bootstrap] ensuring backend Python toolchain via setup.js"
# ESM setup script self-heals pip (ensurepip) and installs pinned osxphotos.
node "$ROOT_DIR/backend/scripts/setup.js" || true

echo "[bootstrap] building filename index"
# Default to .jpg normalization unless caller overrides JPEG_EXT
JPEG_EXT="${JPEG_EXT:-jpg}" npm run build:filename-index || true

echo "[bootstrap] done"

