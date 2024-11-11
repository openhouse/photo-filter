# backend/scripts/export_albums.py

import osxphotos
import json
import sys

def main():
    photosdb = osxphotos.PhotosDB()
    albums = photosdb.album_info  # Use album_info to get AlbumInfo objects

    albums_data = []
    for album in albums:
        album_info = {
            "uuid": album.uuid,
            "title": album.title,
        }
        albums_data.append(album_info)

    # Output JSON data to stdout
    json.dump(albums_data, sys.stdout, indent=4)

if __name__ == "__main__":
    main()