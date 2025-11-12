# Photo Filter REST API Reference

This document describes every REST endpoint exposed by the Photo Filter backend. All routes are served from the Express application under the `/api` prefix. Unless noted otherwise, requests and responses use JSON and assume UTF-8 encoding.

## Overview

- **Base URL:** `https://<host>/api`
- **Authentication:** None. The API is intended for internal tooling and the accompanying frontend.
- **Content negotiation:** Requests should set `Accept: application/json`. The backend always replies with JSON, including error responses.
- **Rate limiting:** None enforced by the backend.

### Conventions

- Album and photo payloads follow [JSON:API](https://jsonapi.org/) conventions for `data`, `included`, and `relationships` members.
- Error payloads always have the shape `{ "errors": [{ "detail": "..." }] }`.
- The backend sets several custom headers to expose export state. These headers are documented in [Export status headers](#export-status-headers).
- When the album export process is running the backend may return HTTP 503 with `Retry-After: 1` to signal transient unavailability rather than a fatal error.

### Export status headers

The backend uses the following custom headers to communicate long-running export status:

| Header | When present | Possible values |
| --- | --- | --- |
| `X-PF-Export-Status` | Album and photo endpoints | `pending`, `running`, `ready`, `error`, `needs-prep`, or `skipped-empty` (when an album contains no exportable photos). |
| `X-PF-Export-Started-At` | Album list/detail endpoints | ISO-8601 timestamp of the last export start, when known. |
| `X-PF-Export-Finished-At` | Album list/detail endpoints | ISO-8601 timestamp of the last export finish, when known. |
| `X-PF-Album-Count` | `GET /api/albums/:albumUUID/photos` responses | Number of photos returned in the payload. |
| `X-PF-Resolve` | Filename lookup endpoints | Indicates how the lookup was satisfied: `cache`, `disk`, `json`, `miss`, `invalid`, or `error`. |
| `X-PF-Miss-Reason` | Filename lookup endpoints (404 responses) | Additional detail such as `uninitialized` or `json`.
| `X-PF-Exporting` | Album list/detail endpoints during exports | Present and set to `1` when the export process is running and the request was rejected with HTTP 503.

Unless otherwise stated, success responses use HTTP 200, validation issues use HTTP 400, missing records use HTTP 404, and unexpected errors use HTTP 500.

## Albums

### List albums

`GET /api/albums`

Returns all albums known to the system. Each album is returned as a JSON:API resource with `type: "album"`, a `uuid` identifier, and a `title` attribute. The response may also include `relationships.persons` that reference people detected in each album.

**Success (200)**

- Body: `{ data: [...], meta: {...} }` in JSON:API format.
- Headers: `X-PF-Export-Status`, `X-PF-Export-Started-At`, and `X-PF-Export-Finished-At` are populated when an export status file is present. The status defaults to `ready` when absent.

**Export still running (503)**

- Triggered when the album export JSON is still being generated or stabilised.
- Headers: `Retry-After: 1`, `X-PF-Exporting: 1`, and `X-PF-Export-Status: running` (if the status file has not been created yet).
- Body: `{ "errors": [{ "detail": "Albums export in progress. Please retry shortly." }] }`.

**Errors**

- `500` for unexpected exceptions while reading album metadata.

_Source: [`backend/controllers/api/albums-controller.js`](../backend/controllers/api/albums-controller.js)_

### Fetch a single album

`GET /api/albums/:albumUUID`

Retrieves a single album along with the unique people detected in its photos. The primary data is the album resource; the response merges in `included` person resources to match JSON:API expectations.

**Success (200)**

- Body: `{ data: { ... }, included: [...], meta: {} }`. The included collection contains person objects with `{ type: "person", id, attributes: { name } }`.
- Headers: `X-PF-Export-Status`, `X-PF-Export-Started-At`, `X-PF-Export-Finished-At` as above.

**Album not found (404)**

Returned when the requested `albumUUID` does not exist in `albums.json`.

**Export still running (503)**

Same behaviour and headers as the list endpoint when album JSON is unavailable or being rewritten.

**Errors**

- `500` for unexpected exceptions.

_Source: [`backend/controllers/api/albums-controller.js`](../backend/controllers/api/albums-controller.js)_

## Photos within an album

### List photos in an album

`GET /api/albums/:albumUUID/photos`

Returns all photos in the album. Each photo is serialised as a JSON:API resource with attributes:

- `originalName` (filename without extension),
- `originalFilename`,
- `exportedFilename` (best guess or actual exported filename),
- `score` (object containing aesthetic metrics),
- `exifInfo` (object with EXIF metadata when available).

Each photo includes `relationships.album` and `relationships.persons`. The response also includes all unique persons in the `included` array.

**Query parameters**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `sort` | string | `score.overall` | Dot-path into the photo object used for sorting. |
| `order` | `asc \| desc` | `desc` | Sort direction. |
| `prepare` | `"1"` | `null` | When `1`, instructs the backend to trigger export preparation if the album has not been prepared yet. |

**Success (200)**

- Headers: `X-PF-Export-Status` (album or skipped-empty status), `X-PF-Album-Count`, and `Link: </api/albums/:albumUUID/status>; rel="status"`.
- Body: `{ data: [...], included: [...], meta: { albumUUID, sortAttribute, sortOrder, scoreAttributes, exportStatus } }`.

**Album requires preparation (202)**

If the album has no `photos.json` yet and `prepare` is not set, the endpoint replies with 202 to prompt the caller to trigger preparation.

- Headers: `X-PF-Export-Status` (current status or `needs-prep`), `X-PF-Album-Count: 0`, and `Link` pointing to the status endpoint.
- Body: JSON:API envelope with an empty `data` array and a `meta.nextSteps` object containing helpful URLs (`prepareQuery`, `prepareEndpoint`, `statusEndpoint`).

**Errors**

- `500` on unexpected failures.

_Source: [`backend/controllers/api/photos-controller.js`](../backend/controllers/api/photos-controller.js)_

### Trigger album preparation

`POST /api/albums/:albumUUID/prepare`

Starts (or reuses) the asynchronous export workflow for the specified album. The request body is ignored.

- Success responses include the current export status JSON. HTTP 202 indicates the export is still running; HTTP 200 indicates it is already `ready`.
- Headers: `X-PF-Export-Status` and `Link: </api/albums/:albumUUID/status>; rel="status"`.
- Errors: `500` on unexpected failures.

_Source: [`backend/controllers/api/photos-controller.js`](../backend/controllers/api/photos-controller.js)_

### Check album export status

`GET /api/albums/:albumUUID/status`

Retrieves the persisted export status for an album. The JSON payload mirrors the `status.json` file stored under the album’s export directory and can contain fields such as `status`, `startedAt`, `finishedAt`, `errorMessage`, `logPath`, `exportedCount`, `materialization`, and `lastMaterializedAt`.

- Success: HTTP 200 with the status object.
- Errors: `500` if the status cannot be read.

_Source: [`backend/controllers/api/export-status.js`](../backend/controllers/api/export-status.js)_

### Refresh album metadata and thumbnails

`POST /api/albums/:albumUUID/refresh`

Deletes the cached metadata (`photos.json`) and exported thumbnails for the album, then immediately re-runs the preparation workflow.

- Success: HTTP 200 with `{ "message": "Album <uuid> metadata and images have been refreshed." }`.
- Errors: `500` when the refresh operation fails. The response body follows the generic error format.

_Source: [`backend/routes/api.js`](../backend/routes/api.js)_

## People

### List people detected in an album

`GET /api/albums/:albumUUID/persons`

Returns a simple array of all distinct person names that appear in the album’s photos.

- Success: HTTP 200 with `{ "data": ["Alice", "Bob", ...] }`.
- Album not found or not yet prepared: HTTP 404 with an error payload.
- Errors: HTTP 500 on unexpected exceptions.

_Source: [`backend/controllers/api/people-controller.js`](../backend/controllers/api/people-controller.js)_

### List photos for a specific person

`GET /api/albums/:albumUUID/person/:personName`

Returns the subset of album photos that include the specified person. Sorting works the same way as the main photo listing.

**Query parameters**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `sort` | string | `score.overall` | Dot-path into the photo object used for sorting. |
| `order` | `asc \| desc` | `desc` | Sort direction. |

**Responses**

- Success: HTTP 200 with a JSON:API response containing the person’s photos. The `meta` section includes `albumUUID`, `personName`, `sortAttribute`, `sortOrder`, and the available `scoreAttributes`.
- No matching photos: HTTP 200 with an empty `data` array and metadata populated for context.
- Album missing/not prepared: HTTP 404.
- Errors: HTTP 500 for unexpected issues.

_Source: [`backend/controllers/api/people-controller.js`](../backend/controllers/api/people-controller.js)_

## Filename lookup

These endpoints resolve people detected in a photo when only the exported filename is known. Both forms call the same controller.

### Lookup by path parameter

`GET /api/photos/by-filename/:filename/persons`

### Lookup by exported filename (alias)

`GET /api/people/by-filename/:filename`

### Lookup by query parameter

`GET /api/people/by-filename?filename=<name>`

The backend normalises and validates the filename, searches cached mappings, and scans album metadata as needed. Responses:

- Success: HTTP 200 with `{ "data": ["Alice", "Bob"] }`. The `X-PF-Resolve` header reveals whether the value came from cache, disk, or JSON scanning.
- Invalid or missing filename: HTTP 400 with `X-PF-Resolve: invalid`.
- Filename not present in any album: HTTP 404 with `X-PF-Resolve: miss`. `X-PF-Miss-Reason` describes the miss (`uninitialized`, `json`, etc.).
- Errors: HTTP 500 with `X-PF-Resolve: error`.

_Source: [`backend/controllers/api/filename-controller.js`](../backend/controllers/api/filename-controller.js), [`backend/app.js`](../backend/app.js)_

## Exporting photos

### Export top-N photos per aesthetic attribute

`POST /api/albums/:albumUUID/export-top-n`

Copies the top `N` photos for each aesthetic score into organised directories under the album’s export path. The request body must be JSON.

**Request body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `n` | number | Optional | Number of photos to export per attribute. Defaults to `1` and is coerced to a minimum of `1`. |
| `persons` | array of strings | Optional | When provided, only photos that include *all* listed person names are considered. |

**Responses**

- Success: HTTP 200 with `{ "message": "Exported top <n> photos to <path>" }`.
- Errors: HTTP 500 for unexpected failures.

_Source: [`backend/controllers/api/export-top-n.js`](../backend/controllers/api/export-top-n.js)_

### Export all photos (optionally filtered by people)

`POST /api/albums/:albumUUID/export-all`

Copies every exported photo for the album into an `_all` directory under the album’s export path. Optional filtering by person works the same way as `export-top-n`.

**Request body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `persons` | array of strings | Optional | Only export photos that include *all* listed people. |

**Responses**

- Success: HTTP 200 with `{ "message": "Exported <count> photos to <path>" }`.
- Errors: HTTP 500 for unexpected failures.

_Source: [`backend/controllers/api/export-all.js`](../backend/controllers/api/export-all.js)_

## Fallback routes and retired features

- Any unmatched path under `/api` returns HTTP 404 with `{ "errors": [{ "detail": "Not Found" }] }`.
- The historical `GET /api/time-index` endpoint has been retired. The controller remains as a stub that would return HTTP 410 with `{ "errors": [{ "detail": "The time-index feature has been retired." }] }` if it were mounted.

_Source: [`backend/routes/api.js`](../backend/routes/api.js), [`backend/controllers/api/time-controller.js`](../backend/controllers/api/time-controller.js)_
