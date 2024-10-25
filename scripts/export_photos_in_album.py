#!/usr/bin/env python3

# ./scripts/export_photos_in_album.py

import sys
import osxphotos
import json

def main():
    if len(sys.argv) != 2:
        print("Usage: export_photos_in_album.py ALBUM_UUID", file=sys.stderr)
        sys.exit(1)
    
    album_uuid = sys.argv[1]
    photosdb = osxphotos.PhotosDB()
    
    # Find the album by UUID
    album = next((album for album in photosdb.album_info if album.uuid == album_uuid), None)
    
    if not album:
        print(f"No album found with UUID: {album_uuid}", file=sys.stderr)
        sys.exit(1)
    
    # Get photos in the album
    photos = album.photos
    
    # Include score information
    photos_data = []
    for photo in photos:
        photo_dict = photo.asdict()
        photo_dict['score'] = photo.score.asdict()
        photos_data.append(photo_dict)
    
    # Output as JSON
    print(json.dumps(photos_data, indent=2))

if __name__ == "__main__":
    main()
