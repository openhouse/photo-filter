# ./scripts/export_photos_in_album.py

import osxphotos
import sys
import json

def main():
    album_uuid = sys.argv[1]
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

    # Output the data as JSON, handling datetime objects
    print(json.dumps(photos_data, indent=4, default=str))

if __name__ == "__main__":
    main()
