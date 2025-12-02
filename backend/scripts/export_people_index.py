#!/usr/bin/env python3
# ./scripts/export_people_index.py

#!/usr/bin/env python3
# ./scripts/export_people_index.py

import argparse
import json
from datetime import timezone
from pathlib import Path

import osxphotos


def isoformat_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def build_people_index(db):
    people = {}

    for photo in db.photos():
        date = getattr(photo, "date", None)
        if not date:
            continue

        persons = getattr(photo, "persons", None) or []
        uuid = getattr(photo, "uuid", None)

        for person_name in persons:
            bucket = people.setdefault(person_name, [])
            bucket.append((date, uuid))

    summaries = []

    for name, entries in people.items():
        if not entries:
            continue

        sorted_entries = sorted(entries, key=lambda pair: pair[0])

        n = len(sorted_entries)
        median_index = n // 2
        median_entry = sorted_entries[median_index]

        summaries.append(
            {
                "id": f"person:{name}",
                "name": name,
                "photoCount": n,
                "earliestPhotoAt": isoformat_utc(sorted_entries[0][0]),
                "latestPhotoAt": isoformat_utc(sorted_entries[-1][0]),
                "medianPhotoAt": isoformat_utc(median_entry[0]),
                "heroUuid": median_entry[1],
            }
        )

    return summaries


def main():
    parser = argparse.ArgumentParser(description="Export library-wide people index")
    parser.add_argument("--db", help="Path to a specific Photos library", default=None)
    parser.add_argument("--out", "--output", required=True, dest="out")
    args = parser.parse_args()

    db = osxphotos.PhotosDB(dbfile=args.db) if args.db else osxphotos.PhotosDB()

    summaries = build_people_index(db)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(summaries, fh, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
