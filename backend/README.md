# Backend

### Filename indexer (osxphotos)

The backend builds a filename → UUID index from the system Photos library:

- Index file: `backend/data/library/filename-index.json`
- Collisions file: `backend/data/library/filename-collisions.json` (values are arrays)

**Key computation:** We render the template string with osxphotos’ `PhotoInfo.render_template(...)` and take the first string from the returned list. Note: `render_template` returns a **list**; we take `[0]`.

**Template default:** `{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}{ext}` (UTC, microseconds, original extension). You can override via `FILENAME_TEMPLATE` (see `.env.example`).

**JPEG extension normalization:** If `JPEG_EXT` is set, we replace `.jpg/.jpeg/.JPG/.JPEG` with the requested suffix.

**Collision tiebreak:** area → size → prefer non-RAW → UUID.
