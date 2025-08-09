#!/usr/bin/env python3
"""Build exported filename -> uuid index for the Photos library."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

from osxphotos import PhotosDB

DEFAULT_TEMPLATE = "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}{ext}"
JPEG_EXTS = {".jpg", ".JPG", ".jpeg", ".JPEG"}


def render_key(photo, template: str, jpeg_ext: str | None) -> str:
    parts = photo.render_template(template, none_str="")
    key = parts[0] if parts else ""
    if jpeg_ext and any(key.endswith(ext) for ext in JPEG_EXTS):
        key = key[: key.rfind(".")] + f".{jpeg_ext}"
    return key


def photo_quality(photo) -> tuple:
    return (
        (photo.width or 0) * (photo.height or 0),
        photo.original_filesize or 0,
        0 if photo.has_raw else 1,
        photo.uuid,
    )


def build_index(db: PhotosDB, template: str, jpeg_ext: str | None):
    winners: Dict[str, tuple] = {}
    collisions: Dict[str, List[str]] = {}
    for photo in db.photos():
        key = render_key(photo, template, jpeg_ext)
        if not key:
            continue
        quality = photo_quality(photo)
        if key not in winners:
            winners[key] = (quality, photo.uuid)
        else:
            collisions.setdefault(key, [winners[key][1]])
            if photo.uuid not in collisions[key]:
                collisions[key].append(photo.uuid)
            if quality > winners[key][0]:
                winners[key] = (quality, photo.uuid)
    index = {k: v[1] for k, v in winners.items()}
    return index, collisions


def main() -> None:
    parser = argparse.ArgumentParser()
    repo_root = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "--output",
        default=repo_root / "backend" / "data" / "library" / "filename-index.json",
    )
    parser.add_argument(
        "--collisions",
        default=repo_root / "backend" / "data" / "library" / "filename-collisions.json",
    )
    parser.add_argument(
        "--template",
        default=DEFAULT_TEMPLATE,
    )
    parser.add_argument(
        "--jpeg-ext",
        choices=["jpg", "jpeg", "JPG", "JPEG"],
    )
    args = parser.parse_args()

    db = PhotosDB()
    index, collisions = build_index(db, args.template, args.jpeg_ext)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as fp:
        json.dump(index, fp)
    with open(Path(args.collisions), "w") as fp:
        json.dump(collisions, fp)

    total = len(index)
    colliding = sum(1 for v in collisions.values() if v)
    max_size = max((len(v) for v in collisions.values()), default=1)
    print(
        f"[index] wrote {total} keys ({colliding} with collisions, max {max_size})"
    )


if __name__ == "__main__":
    main()
