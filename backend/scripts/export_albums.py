#!/usr/bin/env python3

# ./scripts/export_albums.py

import osxphotos
import json

def main():
    photosdb = osxphotos.PhotosDB()
    albums = photosdb.albums

    album_list = []
    for album in albums:
        album_list.append({"title": album.title, "uuid": album.uuid})

    print(json.dumps(album_list, indent=2))

if __name__ == "__main__":
    main()
