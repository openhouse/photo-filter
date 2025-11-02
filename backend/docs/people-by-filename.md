# People by filename API

**Purpose:** Resolve Apple Photos person tags even when the exported image has not landed on disk yet.

## Routes

- `GET /api/people/by-filename/:filename`
- `GET /api/people/by-filename?filename=...`

Both routes expect URL-encoded filenames. The server decodes path and query parameters automatically.

## Responses

- **200 OK** – `{ "data": ["Alice", "Bob"] }`
- **400 Bad Request** – `{ "errors": [{ "detail": "Filename is required" }] }`
- **400 Bad Request** – `{ "errors": [{ "detail": "Invalid filename" }] }`
- **404 Not Found** – `{ "errors": [{ "detail": "Photo not found" }] }`
- **500 Internal Server Error** – `{ "errors": [{ "detail": "Internal Server Error" }] }`

All `/api/*` responses are JSON and include `Content-Type: application/json`.

## Notes

- During long exports the physical image may not exist yet. The controller falls back to streaming each album’s `photos.json` to rebuild the exported filename and still resolve people.
- Person names come exclusively from Apple Photos metadata (`persons`, `persons_full`, `face_names`, `faceInfo[].name`). Scene labels such as “Outdoor” or “Building” are excluded.
- Responses include an `X-PF-Resolve` header describing where the result came from (`cache`, `disk`, `json`, `miss`, or `invalid`).
- The controller streams `photos.json` to keep memory use bounded and relies on lightweight caches, per-album locks, and a short-lived negative cache for misses.
- Cache TTLs and sizes can be tuned with the `PF_FILENAME_CACHE_TTL_MS`, `PF_FILENAME_CACHE_MAX`, `PF_PERSONS_CACHE_TTL_MS`, and `PF_PERSONS_CACHE_MAX` environment variables.
- Run `./scripts/smoke-people-by-filename.sh "<filename>"` to exercise both path and query variants locally.

## Examples

```bash
FILE='20221201T174242329834Z-IMG_5899.jpg'
ENC="$(printf '%s' "$FILE" | jq -sRr @uri)"

# Path parameter variant
curl -sS -H 'Accept: application/json' \
  "http://localhost:3000/api/people/by-filename/$ENC" | jq .

# Query parameter variant
curl -sS -H 'Accept: application/json' \
  "http://localhost:3000/api/people/by-filename?filename=$ENC" | jq .
```

Expect `{ "data": [...] }` when the photo exists and `{ "errors": [{ "detail": "Photo not found" }] }` when it does not.
