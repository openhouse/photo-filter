#!/usr/bin/env python3
"""
export_photos_in_album.py  ALBUM_UUID  OUTPUT_JSON  [SINCE_ISO]

Export metadata for all photos in a given Photos.app album to
`OUTPUT_JSON` (JSON list).  When SINCE_ISO is supplied the script
writes **only** photos whose *date_modified* is later than that time,
enabling truly incremental syncs.

The script is intentionally self‑contained so it can run inside the
backend's venv without any extra CLI flags from Node.
"""

from __future__ import annotations

import json
import sys
import datetime as _dt
from pathlib import Path

try:
    from osxphotos import PhotosDB  # type: ignore
except ImportError as exc:  # pragma: no cover
    sys.stderr.write(
        "❌  osxphotos is not installed inside the virtualenv:"
        "  run  npm --workspace backend run setup\n"
    )
    raise

ISO8601_FMT = "%Y-%m-%dT%H:%M:%S.%fZ"


def _parse_args() -> tuple[str, Path, _dt.datetime | None]:
    if len(sys.argv) < 3:
        sys.stderr.write(
            "usage: export_photos_in_album.py ALBUM_UUID OUTPUT_JSON [SINCE_ISO]\n"
        )
        sys.exit(1)

    album_uuid = sys.argv[1]
    dst = Path(sys.argv[2]).expanduser().resolve()
    since = None
    if len(sys.argv) >= 4 and sys.argv[3] not in ("", "null", "None"):
        try:
            since = _dt.datetime.fromisoformat(sys.argv[3].replace("Z", "+00:00"))
        except ValueError:
            sys.stderr.write(f"⚠️  ignoring invalid ISO timestamp: {sys.argv[3]!r}\n")
            since = None

    return album_uuid, dst, since


def main() -> None:
    album_uuid, out_path, since = _parse_args()

    db = PhotosDB()
    album = db.get_album(album_uuid)
    if album is None:
        sys.stderr.write(f"⚠️  album {album_uuid} not found – writing empty list.\n")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text("[]", encoding="utf-8")
        return

    photos = album.photos
    if since:
        photos = [p for p in photos if p.date_modified and p.date_modified > since]

    payload = [p.json() for p in photos]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":  # pragma: no cover
    main()
