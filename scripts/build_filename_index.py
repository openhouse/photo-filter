#!/usr/bin/env python3
"""Build exported filename -> uuid index for the Photos library."""
from osxphotos import PhotosDB
from pathlib import Path
import argparse
import json
from typing import Dict, List


def _photo_key_names(photo) -> List[str]:
    """Return canonical names for indexing.

    Prefer original_filename; fall back to filename. Flatten and de-duplicate.
    """
    candidates = []
    if getattr(photo, "original_filename", None):
        candidates.append(photo.original_filename)
    if getattr(photo, "filename", None):
        candidates.append(photo.filename)
    flat: List[str] = []
    for c in candidates:
        if isinstance(c, (list, tuple)):
            flat.extend([x for x in c if x])
        elif c:
            flat.append(c)
    seen = set()
    return [x for x in flat if not (x in seen or seen.add(x))]


def build_index(db: PhotosDB):
    winners: Dict[str, dict] = {}
    collisions: Dict[str, List[str]] = {}
    for photo in db.photos():
        for fname in _photo_key_names(photo):
            if fname not in winners:
                winners[fname] = {"uuid": photo.uuid}
            else:
                collisions.setdefault(fname, [winners[fname]["uuid"]])
                if photo.uuid not in collisions[fname]:
                    collisions[fname].append(photo.uuid)
    index = {fname: data["uuid"] for fname, data in winners.items()}
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
    args = parser.parse_args()

    db = PhotosDB()
    index, collisions = build_index(db)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as fp:
        json.dump(index, fp)
    try:
        with open(Path(args.collisions), "w") as fp:
            json.dump(collisions, fp)
    except Exception:
        pass


if __name__ == "__main__":
    main()
