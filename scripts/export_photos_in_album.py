# ./scripts/export_photos_in_album.py

import osxphotos
import sys
import json

def main():
    if len(sys.argv) < 2:
        print("Usage: export_photos_in_album.py <album_uuid>")
        sys.exit(1)

    album_uuid = sys.argv[1]
    photosdb = osxphotos.PhotosDB()
    album = photosdb.get_album_by_uuid(album_uuid)

    if not album:
        print(f"No album found with UUID {album_uuid}")
        sys.exit(1)

    photos = []
    for photo in album.photos:
        # Add shortuuid to the photo data
        photos.append({
            'uuid': photo.uuid,
            'shortuuid': photo.shortuuid,
            'original_filename': photo.original_filename,
            'filename': photo.filename,
            'score': photo.score,
            'date': photo.date.isoformat(),
            'description': photo.description,
            'albums': photo.albums,
            'keywords': photo.keywords,
            'persons': photo.persons,
            # Add any other fields you need
        })

    print(json.dumps(photos, indent=2))

if __name__ == "__main__":
    main()
