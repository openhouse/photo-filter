#!/usr/bin/env python3
# ./scripts/export_people_index.py

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

import osxphotos

# Keep this in sync with backend/utils/export-images.js (osxphotos export).
# The template is expected to produce a flat basename; directory components are
# intentionally disallowed because /library/images only serves basenames.
FILENAME_TEMPLATE_DEFAULT = "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}"


def isoformat_utc(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def atomic_write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp_path, path)


def normalize_jpeg_ext(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    ext = raw if raw.startswith(".") else f".{raw}"
    return ext


def rendered_exported_name(photo: osxphotos.PhotoInfo, template: str, jpeg_ext: Optional[str]) -> Optional[str]:
    try:
        rendered = photo.render_template(
            template,
            none_str="",
            path_sep="_",
            filename=True,
        )
    except Exception:
        return None

    candidate = None
    if isinstance(rendered, (list, tuple)):
        candidate = rendered[0] if rendered else None
    elif isinstance(rendered, str):
        candidate = rendered

    if not candidate:
        return None

    lower = candidate.lower()
    if jpeg_ext and (lower.endswith(".jpg") or lower.endswith(".jpeg")):
        stem = candidate.rsplit(".", 1)[0]
        candidate = f"{stem}{jpeg_ext}"
    elif jpeg_ext and not Path(candidate).suffix:
        candidate = f"{candidate}{jpeg_ext}"

    return candidate


def choose_highlight_photo(photos: Iterable[osxphotos.PhotoInfo]) -> Optional[osxphotos.PhotoInfo]:
    best_photo = None
    best_score = None

    for photo in photos:
        score = getattr(photo, "score", None)
        value = None
        if score is not None:
            value = getattr(score, "highlight_visibility", None)
            if value is None and isinstance(score, dict):
                value = score.get("highlight_visibility")
            if value is None:
                value = getattr(score, "overall", None)
                if value is None and isinstance(score, dict):
                    value = score.get("overall")

        if value is None:
            continue

        if best_score is None or value > best_score:
            best_score = value
            best_photo = photo

    return best_photo


def summarize_person(person: osxphotos.PersonInfo, template: str, jpeg_ext: Optional[str]):
    photos = [p for p in person.photos if getattr(p, "date", None)]
    if not photos:
        return None

    sorted_photos = sorted(photos, key=lambda p: p.date or datetime.min)
    earliest = sorted_photos[0]
    latest = sorted_photos[-1]
    median = sorted_photos[len(sorted_photos) // 2]

    highlight = choose_highlight_photo(sorted_photos) or median

    def exported_name(photo: osxphotos.PhotoInfo) -> Optional[str]:
        return rendered_exported_name(photo, template, jpeg_ext)

    return {
        "id": f"person:{person.uuid}",
        "name": person.name or None,
        "displayName": getattr(person, "display_name", None) or person.name or None,
        "photoCount": len(sorted_photos),
        "earliestPhotoAt": isoformat_utc(getattr(earliest, "date", None)),
        "medianPhotoAt": isoformat_utc(getattr(median, "date", None)),
        "latestPhotoAt": isoformat_utc(getattr(latest, "date", None)),
        "heroUuidEarliest": getattr(earliest, "uuid", None),
        "heroUuidMedian": getattr(median, "uuid", None),
        "heroUuidLatest": getattr(latest, "uuid", None),
        "heroUuidHighlight": getattr(highlight, "uuid", None),
        "heroUuid": getattr(median, "uuid", None),
        "earliestExportedName": exported_name(earliest),
        "medianExportedName": exported_name(median),
        "latestExportedName": exported_name(latest),
        "highlightExportedName": exported_name(highlight),
    }


def build_people_index(db: osxphotos.PhotosDB, template: str, jpeg_ext: Optional[str]):
    """Return a list of people summaries with hero UUIDs and exported filenames.

    Each entry contains:
    * id: "person:<uuid>" (stable Photos person id)
    * name / displayName (may be empty for unnamed people)
    * photoCount and ISO-8601 timestamps for earliest/median/latest photos
    * heroUuid* fields for earliest/median/latest/highlight photos
    * exported basename fields for those hero images
    """
    summaries = []

    for person in db.person_info:
        summary = summarize_person(person, template, jpeg_ext)
        if summary is not None:
            summaries.append(summary)

    return summaries


def main():
    parser = argparse.ArgumentParser(description="Export library-wide people index")
    parser.add_argument("--db", help="Path to a specific Photos library", default=None)
    parser.add_argument("--out", "--output", required=True, dest="out")
    args = parser.parse_args()

    db = osxphotos.PhotosDB(dbfile=args.db) if args.db else osxphotos.PhotosDB()

    filename_template = os.environ.get("FILENAME_TEMPLATE", FILENAME_TEMPLATE_DEFAULT)
    jpeg_ext = normalize_jpeg_ext(os.environ.get("JPEG_EXT"))

    summaries = build_people_index(db, filename_template, jpeg_ext)

    out_path = Path(args.out)
    atomic_write_json(out_path, summaries)


if __name__ == "__main__":
    main()
