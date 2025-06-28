# REST API Endpoints

This project exposes a small JSON API for the Ember frontend. All routes are served under `/api` from the Express backend.

## Albums

- `GET /api/albums`
  - List all available albums.
- `GET /api/albums/:albumUUID`
  - Details for a single album.
- `GET /api/albums/:albumUUID/photos`
  - Photos within the album. Supports `sort` and `order` query params.

## People

- `GET /api/albums/:albumUUID/persons`
  - List all person names that appear in the album.
- `GET /api/albums/:albumUUID/person/:personName`
  - Photos in the album containing the given person.
- `GET /api/photos/by-filename/:filename/persons`
  - **New.** Returns the people detected in a photo by its exported filename (e.g. `20250530T233513160000Z-_DSF7004.jpg`). Searches across all album data.

## Time Index

- `GET /api/time-index`
  - Hierarchical JSON of available years/months/weeks/days for the photo library.

## Exporting

- `POST /api/albums/:albumUUID/export-top-n`
  - Copy the top N photos for various aesthetic metrics and people.
- `POST /api/albums/:albumUUID/refresh`
  - Regenerate album metadata and thumbnails from the Photos library.

All endpoints return JSON and follow JSON:API conventions where applicable.
