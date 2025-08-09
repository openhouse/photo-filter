#!/usr/bin/env python3
"""Build exported filename -> uuid index for the Photos library."""
import argparse
import json
from pathlib import Path
from osxphotos import PhotosDB

TEMPLATE = "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}.jpg"


def quality_tuple(photo):
    w = getattr(photo, "width", 0) or 0
    h = getattr(photo, "height", 0) or 0
    area = w * h
    bytes_ = getattr(photo, "original_filesize", 0) or 0
    non_raw = 0 if getattr(photo, "has_raw", False) else 1
    return (area, bytes_, non_raw, photo.uuid)


def build_index(db: PhotosDB):
    winners = {}
    collisions = {}
    for p in db.photos():
        fname = p.render_template(TEMPLATE)[0]
        cand = (p.uuid, quality_tuple(p))
        if fname not in winners:
            winners[fname] = cand
        else:
            prev_uuid, prev_q = winners[fname]
            collisions.setdefault(fname, [])
            collisions[fname] = list(set([prev_uuid, p.uuid]))
            if cand[1] > prev_q:
                winners[fname] = cand
    index = {fname: uuid for fname, (uuid, _) in winners.items()}
    return index, collisions


def main() -> None:
    parser = argparse.ArgumentParser()
    repo_root = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "--output",
        default=repo_root
        / "backend"
        / "data"
        / "library"
        / "filename-index.json",
    )
    parser.add_argument(
        "--collisions",
        default=repo_root
        / "backend"
        / "data"
        / "library"
        / "filename-collisions.json",
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

