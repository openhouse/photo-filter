#!/usr/bin/env bash
set -e

VENV_DIR="backend/venv"
PYTHON_BIN="python3"
if [ -x "$VENV_DIR/bin/python3" ]; then
  PYTHON_BIN="$VENV_DIR/bin/python3"
else
  command -v python3 >/dev/null || { echo "python3 not found"; exit 1; }
  python3 -m venv "$VENV_DIR"
  PYTHON_BIN="$VENV_DIR/bin/python3"
fi

echo "[bootstrap] installing osxphotos (and pip upgrade)"
"$PYTHON_BIN" -m pip install --upgrade pip osxphotos

echo "[bootstrap] done"
