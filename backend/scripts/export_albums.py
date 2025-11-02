# backend/scripts/export_albums.py

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import osxphotos


def atomic_write_json(path: Path, payload: Any) -> None:
    """Write ``payload`` to ``path`` atomically."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_suffix = f"{path.suffix}.tmp" if path.suffix else ".tmp"
    tmp_path = path.with_suffix(tmp_suffix)

    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.flush()
        os.fsync(handle.fileno())

    os.replace(tmp_path, path)


def write_status(path: Path, status: dict[str, Any]) -> None:
    """Persist exporter status information atomically."""
    atomic_write_json(path, status)


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def export_albums(output_path: Path, status_path: Path | None) -> None:
    if status_path is not None:
        write_status(status_path, {"status": "running", "startedAt": iso_now()})

    try:
        photosdb = osxphotos.PhotosDB()
        albums = photosdb.album_info

        albums_data = []
        for album in albums:
            albums_data.append({
                "uuid": album.uuid,
                "title": album.title,
            })

        atomic_write_json(output_path, albums_data)

        if status_path is not None:
            write_status(
                status_path,
                {
                    "status": "ready",
                    "finishedAt": iso_now(),
                    "albumsCount": len(albums_data),
                },
            )
    except Exception as exc:  # pragma: no cover - surfaced to caller
        if status_path is not None:
            write_status(
                status_path,
                {
                    "status": "error",
                    "finishedAt": iso_now(),
                    "message": str(exc),
                },
            )
        raise


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export Photo albums to JSON")
    parser.add_argument(
        "--output",
        required=True,
        help="Destination path for albums.json",
    )
    parser.add_argument(
        "--status",
        required=False,
        help="Optional path for export-status.json",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv or sys.argv[1:])
    output_path = Path(args.output).expanduser().resolve()
    status_path = Path(args.status).expanduser().resolve() if args.status else None

    export_albums(output_path, status_path)


if __name__ == "__main__":
    main()
