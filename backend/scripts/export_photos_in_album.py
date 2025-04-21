#!/usr/bin/env python3
"""
Example: export photos from a specific album by UUID
Requires osxphotos >= 0.63
"""

import os
import sys
import argparse
import pathlib

import osxphotos


def main():
    parser = argparse.ArgumentParser(
        description="Export photos from a Photos album by UUID using osxphotos."
    )
    parser.add_argument(
        "--album-uuid",
        required=True,
        help="UUID of the Photos album to export",
    )
    parser.add_argument(
        "--dest",
        required=True,
        help="Destination folder for exported photos",
    )
    parser.add_argument(
        "--download-missing",
        action="store_true",
        help="Attempt to download missing photos from iCloud",
    )
    args = parser.parse_args()

    album_uuid = args.album_uuid
    dest = pathlib.Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)

    # Load the Photos library
    db = osxphotos.PhotosDB()

    # Attempt to find the album matching album_uuid
    # This enumerates all albums then picks the one matching album_uuid.
    try:
        matching_albums = [a for a in db.albums if a.uuid == album_uuid]
    except AttributeError:
        print("Error: 'albums' property is missing or changed in this osxphotos version.")
        sys.exit(1)

    if not matching_albums:
        print(f"No album found with UUID {album_uuid}. Exiting.")
        sys.exit(0)

    album = matching_albums[0]
    photos = album.photos

    print(f"Found album '{album.title}' with {len(photos)} photos.")
    print(f"Exporting to {dest}...")

    for idx, photo in enumerate(photos, start=1):
        # The export2 function returns a list of exported files or raises exceptions on error
        # The new "download_missing" param is True if your library is iCloud-based
        # and you want to force local download of missing images
        print(f"Exporting photo {idx}/{len(photos)}: {photo.original_filename}")
        try:
            exported = photo.export2(
                str(dest),
                download_missing=args.download_missing,
                # Additional params, for example:
                # original_name=True,
                # overwrite=False,
                # sidecar=["xmp"],
            )
            if exported.exported:
                print(f"Exported: {exported.exported}")
            if exported.new:
                print(f"Newly exported: {exported.new}")
            if exported.updated:
                print(f"Updated: {exported.updated}")
            if exported.skipped:
                print(f"Skipped: {exported.skipped}")
        except Exception as e:
            print(f"Error exporting {photo.original_filename}: {e}")

    print("Export complete.")


if __name__ == "__main__":
    main()
