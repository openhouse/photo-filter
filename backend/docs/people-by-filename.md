# People by filename API

**Purpose:** Resolve Apple Photos person tags even when the exported image has not landed on disk yet.

## Routes

- `GET /api/people/by-filename/:filename`
- `GET /api/people/by-filename?filename=...`
- `POST /api/photos/by-filenames/persons` (up to 500 filenames)
- `GET /api/photos/people-index/status`
- `POST /api/photos/people-index/refresh`

Both routes expect URL-encoded filenames. The server decodes path and query parameters automatically.

## Responses

- **200 OK** – `{ "filename": "20221201...jpg", "people": ["Alice", "Bob"] }`
  - Unknown filenames still return HTTP 200 with `people: []` so downstream callers are not forced to treat missing metadata as an error.
- **400 Bad Request** – `{ "errors": [{ "detail": "Filename is required" }] }`
- **400 Bad Request** – `{ "errors": [{ "detail": "Invalid filename" }] }`
- **500 Internal Server Error** – `{ "errors": [{ "detail": "Internal Server Error" }] }`

All `/api/*` responses are JSON and include `Content-Type: application/json`.

## Notes

- During long exports the physical image may not exist yet. The controller falls back to streaming each album’s `photos.json` to rebuild the exported filename and still resolve people.
- Explicit exported basenames take priority. When metadata only has a generic camera filename, the controller derives and prefers the timestamped semantic export name so a reused original name cannot shadow a different photograph.
- Person names come exclusively from Apple Photos metadata (`persons`, `persons_full`, `face_names`, `faceInfo[].name`). Scene labels such as “Outdoor” or “Building” are excluded.
- Responses include an `X-PF-Resolve` header describing where the result came from (`cache`, `disk`, `json`, `miss`, `invalid`, or `error`). On cache misses the response also includes `X-PF-Miss-Reason` to indicate which lookup path failed (`cache`, `disk`, `json`, or `uninitialized`).
- The controller streams `photos.json` to keep memory use bounded and relies on lightweight caches, per-album locks, and a short-lived negative cache for misses.
- The bulk route builds one content-addressed snapshot of every active `photos.json`, then resolves the request without rescanning per filename. Later chunks can use `refresh: "snapshot"` with `expectedCorpusSha256` to pin one revision.
- A matching corpus hash proves that the index matches its `photos.json` inputs. It does not prove those exports match the current Apple Photos library; `sourceFreshness` remains `unknown` until the export layer supplies an upstream revision.
- Use `POST /api/photos/people-index/refresh` with `{ "refresh": "force" }` when a collaborator suspects stale derived data. Refresh is atomic: a failed candidate never replaces the last complete snapshot.
- Set `PF_PEOPLE_METADATA_ROOT` when an isolated worktree or deployment must read the canonical local metadata tree from a different absolute root. Absolute roots do not enter the corpus hash.
- If no active `photos.json` sources are found, refresh returns `503 PEOPLE_INDEX_NO_SOURCES`; it never publishes a valid-looking empty index.
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

Expect `{ "filename": "...", "people": [...] }` when the photo exists and `{ "filename": "...", "people": [] }` when it does not.

Bulk example:

```bash
curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"filenames":["20221201T174242329834Z-IMG_5899.jpg"],"refresh":"verify"}' \
  http://localhost:3000/api/photos/by-filenames/persons | jq .
```
