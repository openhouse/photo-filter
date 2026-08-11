# RFC 0008 — Content-Addressed People Index

| Field | Value |
| --- | --- |
| **Status** | **Draft** |
| **Audience** | Photo Filter and Photo Select contributors |
| **Author** | Jamie Burkart with collaborators |
| **Created** | 2026-08-11 |
| **Related** | RFC 0007 — Incremental Library Sync & Contextual Reload |
| **Companion** | `openhouse/photo-select` RFC 0010 |

---

## 1 — Summary

Replace repeated per-filename scans of `photos.json` with a read-only,
content-addressed people index. A bulk endpoint will resolve many semantic
filenames from one verified snapshot while retaining the existing single-file
endpoint.

The index is a derived acceleration structure. Its identity is the SHA-256 of
the complete set of active `photos.json` sources—not a timestamp, process age,
or assertion that the upstream Apple Photos export is current.

## 2 — Motivation

The current filename endpoint streams an album's `photos.json` for every cold
lookup and serializes those scans with an album lock. A 500-photo Photo Select
wave can therefore spend tens of minutes loading people metadata before the
first model request is sent.

People enrichment is not optional decoration. It lets a person appearing in
multiple photographs participate in the curatorial lens used to distinguish
those photographs. The optimization must preserve that behavior exactly.

## 3 — Freshness model

There are two separate claims:

1. **Index freshness:** the index exactly represents the active
   `photos.json` corpus.
2. **Source freshness:** the active `photos.json` corpus reflects the current
   Apple Photos library.

This RFC proves the first claim. RFC 0007 and the export workflow govern the
second. If no upstream export revision is available, APIs report source
freshness as `unknown`; they never upgrade it to `fresh` merely because the
index hash matches.

### 3.1 Corpus identity

For every active album, resolve the canonical `photos.json` using the same
precedence as the existing filename controller. Sort sources by normalized
relative path. Compute:

```text
source_sha256 = SHA256(exact file bytes)
corpus_sha256 = SHA256(
  "photo-filter-people-index-v1\0" +
  each(relative_path + "\0" + source_sha256 + "\0")
)
```

Adding, deleting, renaming, or changing any active `photos.json` changes the
corpus identity. The source list and per-source hashes remain inspectable in
the snapshot metadata.

### 3.2 Refresh operations

- `verify`: hash every active source and rebuild only when the corpus identity
  differs.
- `force`: hash and rebuild regardless of the stored identity.
- `snapshot`: serve an already verified in-process snapshot. A caller supplies
  the expected `corpus_sha256`; mismatch returns `409` instead of mixing data
  from two revisions.

Refresh constructs a complete candidate snapshot, then swaps it into service
atomically. Readers see either the old complete snapshot or the new complete
snapshot—never a partial index.

## 4 — Index semantics

Each record contains:

```json
{
  "filename": "20260519T235519000000Z-DSCF2331.jpg",
  "resolvedFilename": "20260519T235519000000Z-DSCF2331.jpg",
  "people": ["Alice", "Bob"],
  "albumUUID": "…"
}
```

The builder indexes:

- the canonical exported filename key;
- the normalized original/semantic filename key used by the existing
  fallback resolver;
- all person fields already recognized by `extractPersons`.

An original-name alias is usable only when it resolves to exactly one photo.
Ambiguous aliases remain unresolved, matching the existing safety behavior.
Exact exported-filename matches retain precedence.

## 5 — API

### `POST /api/photos/by-filenames/persons`

Request:

```json
{
  "filenames": ["…jpg", "…jpg"],
  "refresh": "verify",
  "expectedCorpusSha256": null
}
```

Response:

```json
{
  "data": [
    { "filename": "…jpg", "resolvedFilename": "…jpg", "people": [] }
  ],
  "meta": {
    "schemaVersion": 1,
    "corpusSha256": "…",
    "sourceCount": 1,
    "indexStatus": "rebuilt",
    "sourceFreshness": "unknown"
  }
}
```

The endpoint accepts at most 500 filenames per request. Invalid filenames are
reported per item. A missing photo and a lookup failure remain distinguishable.

### `GET /api/photos/people-index/status`

Returns the loaded snapshot identity, generation time, source manifest, and
source-freshness claim without forcing a rebuild.

### `POST /api/photos/people-index/refresh`

Runs `verify` by default and `force` when requested. This is the explicit,
scriptable recovery path when a collaborator suspects stale derived data.

## 6 — Persistence and restart behavior

The first implementation may keep the verified index in memory because one
corpus scan is inexpensive compared with hundreds of repeated scans. A later
implementation may persist the same versioned snapshot atomically under the
local, non-synced data root.

Persistence never bypasses verification. A persisted snapshot is accepted
only after its `corpus_sha256` matches the active sources.

## 7 — Compatibility

- Existing `GET /api/photos/by-filename/:filename/persons` behavior remains.
- Existing filenames, person ordering, and empty-result semantics remain.
- No photo or Photos-library data is mutated.
- Clients without bulk support continue using the legacy endpoint.

## 8 — Observability

Record and expose:

- `people_index_refresh_ms`
- `people_index_lookup_ms`
- `people_index_source_count`
- `people_index_entry_count`
- `corpus_sha256`
- exact, semantic-alias, ambiguous, missing, and invalid counts

Do not log private filenames by default.

## 9 — Evaluation plan

Code-based evals must establish:

1. Two source sets with identical bytes and paths produce the same hash.
2. A byte change, source addition, source deletion, or source rename changes
   the hash.
3. A 500-filename lookup scans each source once, not once per filename.
4. Bulk and legacy lookups return identical people for exact, semantic-alias,
   missing, and ambiguous fixtures.
5. A stale expected hash receives `409` and never mixed-revision output.
6. Refresh failure leaves the previous complete snapshot available and marks
   the refresh failure explicitly.

## 10 — Rollout

1. Land index builder and evals behind the bulk endpoint.
2. Compare bulk and legacy results over a representative local corpus.
3. Enable Photo Select prefetch with automatic legacy fallback.
4. Observe parity and latency before considering removal of repeated scans.

## 11 — Alternatives rejected

- **Raise HTTP concurrency only:** album locks still serialize the expensive
  work and extra streams increase pressure.
- **Disable people tags:** changes curatorial behavior.
- **Trust modification times alone:** preserved or coarse timestamps can make
  stale derived data appear current.
- **Treat a matching corpus hash as proof Apple Photos is current:** conflates
  index freshness with upstream export freshness.

## 12 — Open question

Should RFC 0007 expose an upstream export revision—derived from the Photos
database/export manifest—so `sourceFreshness` can advance from `unknown` to a
bounded, auditable claim?
