#!/usr/bin/env python3

# ./scripts/export_albums.py

import osxphotos
import json
import sys

def main():
    photosdb = osxphotos.PhotosDB()
    albums = photosdb.album_info

    album_list = []
    for album in albums:
        album_list.append({
            "title": album.title,
            "uuid": album.uuid
        })

    # Output JSON to stdout
    json.dump(album_list, sys.stdout, indent=2)

if __name__ == "__main__":
    main()
