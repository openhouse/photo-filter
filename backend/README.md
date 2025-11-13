# Backend

### Filename indexer (osxphotos)

The backend builds a filename → UUID index from the system Photos library:

- Index file: `backend/data/library/filename-index.json`
- Collisions file: `backend/data/library/filename-collisions.json` (values are arrays)

**Key computation:** We render the template string with osxphotos’ `PhotoInfo.render_template(...)` and take the first string from the returned list. Note: `render_template` returns a **list**; we take `[0]`.

**Template default:** `{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}{ext}` (UTC, microseconds, original extension). You can override via `FILENAME_TEMPLATE` (see `.env.example`).

**JPEG extension normalization:** If `JPEG_EXT` is set, we replace `.jpg/.jpeg/.JPG/.JPEG` with the requested suffix.

**Collision tiebreak:** area → size → prefer non-RAW → UUID.

## GET /api/people/by-filename/:filename

- `:filename` — URL-encoded exported basename (e.g. `20100208T174405000000Z-005_3A.jpg`).
- **200**: `{ "data": ["Alice", "Bob"] }`
- **400**: `{ "errors": [{ "detail": "Filename is required" }] }`
- **400**: `{ "errors": [{ "detail": "Invalid filename" }] }`
- **404**: `{ "errors": [{ "detail": "Photo not found" }] }`
- **500**: `{ "errors": [{ "detail": "Internal Server Error" }] }`

Notes:

- Query variant supported: `GET /api/people/by-filename?filename=...`.
- Filenames must be percent-encoded in the URL; Express decodes automatically.
- Responses report `X-PF-Resolve: cache|disk|json|miss|invalid|error` for debugging and to surface cache hits. When the photo cannot be located the API also emits `X-PF-Miss-Reason` (`cache`, `disk`, `json`, or `uninitialized`).
- Lookups stream `<album>/photos.json` to rebuild filenames and merge Apple Photos person fields (no ML scene labels) when exported images are missing.
- Cache TTLs and sizes can be tuned with `PF_FILENAME_CACHE_TTL_MS`, `PF_FILENAME_CACHE_MAX`, `PF_PERSONS_CACHE_TTL_MS`, and `PF_PERSONS_CACHE_MAX`.
- Legacy compatibility: `/api/photos/by-filename/:filename/persons` continues to resolve to the same controller.

Example:

```bash
backend/scripts/smoke-people-by-filename.sh "20100208T174405000000Z-005_3A.jpg"
```

## Storage environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PF_LIBRARY_ROOT` | `<PF_LOCAL_ROOT>/library` | Override the shared library location (must point to a local, non-iCloud volume). |
| `PF_LIBRARY_DIR_TEMPLATE` | `{created.utc.year}/{created.utc.mm}/{created.utc.dd}` | Directory layout passed to `osxphotos --directory` and used when resolving library paths. Surround with quotes if your shell would otherwise expand braces. |
| `PF_CLONE_CONCURRENCY` | `8` | Maximum concurrent clone/link/copy operations when materialising album images from the library. |
