# ./scripts/export_photos_in_album.py

import json
import os
import sys
from typing import Any, Iterable, Optional

import osxphotos


def normalize_date(value: Any):
    if value is None:
        return None
    try:
        if hasattr(value, "isoformat"):
            return value.isoformat()
    except Exception:
        pass
    try:
        return str(value)
    except Exception:
        return None


def safe_list(value: Any) -> list:
    if isinstance(value, (list, tuple, set)):
        return [item for item in value if item is not None]
    return []


def serialize_score(score: Any):
    if score is None:
        return None
    if isinstance(score, dict):
        return score
    if hasattr(score, "_asdict"):
        try:
            return score._asdict()
        except Exception:
            pass
    if hasattr(score, "asdict"):
        try:
            return score.asdict()
        except Exception:
            pass
    if hasattr(score, "__dict__"):
        try:
            return {
                key: value
                for key, value in score.__dict__.items()
                if not key.startswith("_")
            }
        except Exception:
            pass
    return score


def slim_exif_info(exif_info: Any):
    if exif_info is None:
        return None
    candidates = None
    if isinstance(exif_info, dict):
        candidates = exif_info
    elif hasattr(exif_info, "_asdict"):
        try:
            candidates = exif_info._asdict()
        except Exception:
            candidates = None
    elif hasattr(exif_info, "__dict__"):
        candidates = exif_info.__dict__

    if not candidates:
        return None

    subset = {}
    for key in ("make", "model", "lens_model"):
        if candidates.get(key) is not None:
            subset[key] = candidates[key]
    return subset or None


def slim_photo(photo: Any):
    face_info = []
    for face in getattr(photo, "face_info", None) or []:
        name = getattr(face, "name", None)
        if name:
            face_info.append({"name": name})

    date_value = (
        getattr(photo, "date", None)
        or getattr(photo, "created", None)
        or getattr(photo, "creation_date", None)
        or getattr(photo, "creationDate", None)
    )

    return {
        "uuid": getattr(photo, "uuid", None),
        "original_filename": getattr(photo, "original_filename", None)
        or getattr(photo, "filename", None),
        "filename": getattr(photo, "filename", None),
        "date": normalize_date(date_value),
        "persons": safe_list(getattr(photo, "persons", None)),
        "persons_full": safe_list(getattr(photo, "persons_full", None)),
        "face_names": safe_list(getattr(photo, "face_names", None)),
        "faceInfo": face_info,
        "score": serialize_score(getattr(photo, "score", None)),
        "exif_info": slim_exif_info(getattr(photo, "exif_info", None)),
    }


def ensure_uuid_file(pathname: str):
    try:
        directory = os.path.dirname(pathname) or "."
        os.makedirs(directory, exist_ok=True)
        return open(pathname, "w", encoding="utf-8")
    except OSError as exc:
        print(
            f"Failed to open UUID output {pathname}: {exc}",
            file=sys.stderr,
        )
        sys.exit(1)


def stream_photos(photos: Iterable[Any], uuids_output_path: Optional[str] = None):
    uuid_file = ensure_uuid_file(uuids_output_path) if uuids_output_path else None
    try:
        sys.stdout.write("[")
        first = True
        for photo in photos:
            slimmed = slim_photo(photo)
            if slimmed is None:
                continue
            if uuid_file and getattr(photo, "uuid", None):
                uuid_file.write(f"{photo.uuid}\n")
            if not first:
                sys.stdout.write(",")
            json.dump(
                slimmed,
                sys.stdout,
                default=str,
                ensure_ascii=False,
                separators=(",", ":"),
            )
            first = False
        sys.stdout.write("]\n")
    finally:
        if uuid_file:
            uuid_file.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: export_photos_in_album.py <ALBUM_UUID> [UUIDS_OUTPUT_PATH]", file=sys.stderr)
        sys.exit(1)

    album_uuid = sys.argv[1]
    uuids_output_path = sys.argv[2] if len(sys.argv) > 2 else None
    photosdb = osxphotos.PhotosDB()
    album = None

    # Iterate over albums to find the one with the matching UUID
    for alb in photosdb.album_info:
        if alb.uuid == album_uuid:
            album = alb
            break

    if album is None:
        print(f"Album with UUID {album_uuid} not found.", file=sys.stderr)
        sys.exit(1)

    photos = album.photos

    # Output the data as JSON, handling datetime objects without pretty-printing
    stream_photos(photos, uuids_output_path)


if __name__ == "__main__":
    main()
