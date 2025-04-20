# RFC 0007 — Incremental Library Sync & Contextual Reload

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| **Status**     | **Draft**                                            |
| **Audience**   | Core dev team, advisory board, future contributors   |
| **Authors**    | Jamie Burkart, Rhet Turnbull, Yehuda Katz _(et al.)_ |
| **Created**    |  2025‑04‑19                                          |
| **Supersedes** | Manual _“delete data directory”_ workflow            |
| **Tags**       | photos‑library, sync, backend, ui‑ux, compassion     |

---

## 1 — Purpose & Motivation

Developers currently refresh data by deleting `backend/data/albums/*` and rerunning a full export.  
This:

- **Destroys state** (selected faces, tags, Finder metadata).
- **Wastes I/O** — recopies unchanged originals.
- **Invites race conditions** (Photos still writing).
- **Ignores emotional context** — sudden reshuffles can surface sensitive images without warning.

**Goal:** introduce an incremental, schema‑aware refresh pipeline that respects resources _and_ users’ emotional bandwidth.

---

## 2 — Goals & Non‑Goals

| ID  | Goal                                                              |
| --- | ----------------------------------------------------------------- |
| G1  | Detect new/deleted/edited photos within **≤ 5 min** of change.    |
| G2  | Export only deltas; preserve file names & URLs.                   |
| G3  | Re‑serialize JSON when aesthetic‑score tables mutate (hash diff). |
| G4  | Surface contextual reload cues (album‑row ↻, global badge).       |
| G5  | Offer trauma‑informed copy when major visual shifts occur.        |

| Non‑Goals                               |
| --------------------------------------- |
| Two‑way sync back into Photos           |
| Real‑time per‑asset WebSocket streaming |
| A native Photos extension               |

---

## 3 — System Design Overview

```mermaid
graph TD
  A[Photos.app] -->|WAL settles| Q(photos‑quiet helper)
  Q --> B[Node /api/sync]
  B -->|changed| C[refreshAlbumIncremental]
  C -->|delta export| D[osxphotos --update --modified-since]
  D --> E[compute scoresHash]
  E --> F[write photos.json + images]
  F --> G[return {updatedUUIDs, staleScores}]
  G --> H[Ember ReloadService -> UI badges]
```

- **photos‑quiet (Howard)** – waits 10 s quiet period on WAL file.
- **Incremental export (Rhet)** – `osxphotos export --update --modified-since`.
- **scoresHash (Guilherme)** – MD5 of `ZASSETANALYSISSTATE` rows; detects aesthetic‑score drift.

---

## 4 — API Additions

| Verb   | Path                        | Body | Description                                      |
| ------ | --------------------------- | ---- | ------------------------------------------------ |
| `POST` | `/api/sync`                 | `{}` | Runs global quiet‑check; marks stale albums.     |
| `POST` | `/api/albums/:uuid/refresh` | `{}` | Incremental export for one album.                |
| `GET`  | `/api/library/status`       | —    | Returns `{ staleAlbums: [], globalScoresHash }`. |

**Album payload extension**

```json
{
  "id": "13F8…",
  "attributes": {
    "title": "Inner Space",
    "dataVersion": "2025-04-19T22:32:11Z",
    "scoreHash": "b1e4…"
  }
}
```

---

## 5 — Frontend UX

- **Album List** – hover ↻ icon when album is stale (tooltip: “New photos available – Refresh”).
- **Top Nav** – blue “Library updated” pill when _any_ album stale.
- **Progress** – slim bar reflects export bytes or metadata rewrite.
- **Compassion toast (Camille)** – appears when `updatedPhotos ≥ 100` _or_ `staleScores`:

> “Your library’s perspective evolved. Ready to explore the updates?”  
> Buttons: **View** • **Later** • **Mute for a day**

---

## 6 — Data Format Changes

| File          | New field(s)                  |
| ------------- | ----------------------------- |
| `photos.json` | `scoresVersion` (string)      |
| `albums.json` | `lastSyncAt`, `schemaVersion` |

---

## 7 — Migration Plan

1. **Phase 0 (now)** – keep delete‑folder fallback; add `--update` flags.
2. **Phase 1** – implement `refreshAlbumIncremental`, unit‑test.
3. **Phase 2** – `ReloadService`, UI badges.
4. **Phase 3** – compassion toast + progress bar.
5. **Phase 4** – sandboxed Swift helper with Photos‑library read‑only entitlement.

Feature toggled via `PHOTO_FILTER_INCREMENTAL_SYNC=1`.

---

## 8 — Security & Ethics

- Local‑only processing; no cloud egress.
- Hardened helper tool with read‑only entitlement.
- Logs count UUIDs, never filenames, for opt‑in telemetry.
- Compassion prompts default to _Later_ if dismissed.

---

## 9 — Risks & Mitigations

| Risk                                         | Mitigation                                              |
| -------------------------------------------- | ------------------------------------------------------- |
| Continuous iCloud sync prevents quiet period | Exponential back‑off + “Sync paused—iCloud busy” toast. |
| Deleting files still referenced by UI        | Export to temp dir, atomic rename swap.                 |
| Future sandbox restrictions                  | Helper tool can be notarized independently.             |

---

## 10 — Timeline & Owners

| Week             | Deliverable                           | Owner(s)           |
| ---------------- | ------------------------------------- | ------------------ |
| W‑17 (Apr 21–27) | Backend incremental export + tests    | Rhet, Jamie        |
| W‑18             | `/api/library/status` + ReloadService | Yehuda             |
| W‑19             | UI badges + manual ↻                  | Yehuda, Sebastiaan |
| W‑20             | Compassion toast copy                 | Camille            |
| W‑21             | Hardened helper prototype             | Howard, Guilherme  |

---

## 11 — Acknowledgements

Thanks to Howard Oakley, Guilherme Rambo, Quinn Nelson, Sebastiaan de With,  
Camille Furness, and the entire advisory board for shared vision and care.

> _“Software that cares for memories must itself remember gently.”_

---
