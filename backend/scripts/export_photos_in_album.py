# ./scripts/export_photos_in_album.py

import json
import os
import sys

import osxphotos

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

    # Get photos in the album
    photos = album.photos

    # Convert photo objects to dictionaries
    photos_data = [photo.asdict() for photo in photos]

    if uuids_output_path:
        try:
            directory = os.path.dirname(uuids_output_path) or "."
            os.makedirs(directory, exist_ok=True)
            with open(uuids_output_path, "w", encoding="utf-8") as fh:
                for photo in photos:
                    if getattr(photo, "uuid", None):
                        fh.write(f"{photo.uuid}\n")
        except OSError as exc:
            print(
                f"Failed to write UUIDs to {uuids_output_path}: {exc}",
                file=sys.stderr,
            )
            sys.exit(1)

    # Output the data as JSON, handling datetime objects
    print(json.dumps(photos_data, indent=4, default=str))

if __name__ == "__main__":
    main()
