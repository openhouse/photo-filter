#!/usr/bin/env python3
"""Build filename index for osxphotos library."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    import osxphotos  # type: ignore
except Exception as e:  # pragma: no cover - optional dependency
    raise SystemExit(f"osxphotos is required: {e}")


def render_key(photo, template: str, jpeg_ext: str | None) -> str:
    """Render filename for *photo* using *template*.

    Older versions of osxphotos (e.g., 0.72.1) don't support the ``none_str``
    keyword.  To remain compatible across versions, attempt to call with
    ``none_str"``, and if that fails, fall back to the basic call.
    """

    # Older osxphotos (e.g., 0.72.1) doesn't support none_str kwarg
    try:
        parts = photo.render_template(template, none_str="")
    except TypeError:
        parts = photo.render_template(template)

    key = parts[0] if parts else ""
    if jpeg_ext and key.lower().endswith((".jpg", ".jpeg")):
        key = key[: key.rfind(".")] + f".{jpeg_ext}"
    return key


def quality(photo: osxphotos.PhotoInfo) -> tuple[int, int, int, str]:
    """Return a tuple representing the quality of the photo."""
    area = (photo.width or 0) * (photo.height or 0)
    size = photo.original_filesize or 0
    raw_preference = 0 if photo.has_raw else 1
    return (area, size, raw_preference, photo.uuid)


def build_index(db: osxphotos.PhotosDB, template: str, jpeg_ext: str | None):
    """Return (index, collisions) tuples."""
    winners: dict[str, tuple[tuple[int, int, int, str], str]] = {}
    collisions: dict[str, list[str]] = {}
    for photo in db.photos():
        key = render_key(photo, template, jpeg_ext)
        if not key:
            continue
        q = quality(photo)
        if key not in winners:
            winners[key] = (q, photo.uuid)
        else:
            collisions.setdefault(key, [winners[key][1]])
            if photo.uuid not in collisions[key]:
                collisions[key].append(photo.uuid)
            if q > winners[key][0]:
                winners[key] = (q, photo.uuid)
    index = {k: v[1] for k, v in winners.items()}
    return index, collisions


def main() -> None:
    parser = argparse.ArgumentParser(description="Build filename index")
    parser.add_argument("--output", required=True, help="Path to index JSON")
    parser.add_argument(
        "--collisions",
        help="Optional path for filename collisions JSON",
    )
    parser.add_argument(
        "--template",
        default="{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}{ext}",
    )
    parser.add_argument("--jpeg-ext")
    args = parser.parse_args()

    db = osxphotos.PhotosDB()
    index, collisions = build_index(db, args.template, args.jpeg_ext)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, sort_keys=True)

    if args.collisions:
        collisions_path = Path(args.collisions)
        collisions_path.parent.mkdir(parents=True, exist_ok=True)
        with collisions_path.open("w", encoding="utf-8") as f:
            json.dump(collisions, f, indent=2, sort_keys=True)

    total = len(index)
    collided = sum(len(v) for v in collisions.values())
    print(f"[build_filename_index] wrote {total} entries, {collided} collisions")


if __name__ == "__main__":  # pragma: no cover - CLI entry
    main()
