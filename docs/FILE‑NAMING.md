# FILE‑NAMING.md

## Canonical export filename format  (2025‑06‑17 + videos)

**Pattern**

```
YYYYMMDDTHHMMSSffffffZ‑OriginalName.<ext>
```

| Segment                  | Notes                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| `YYYYMMDDTHHMMSSffffffZ` | **UTC** timestamp with micro‑second precision. Always 27 chars.       |
| `‑` (dash)               | Hard separator between timestamp and original name.                   |
| `OriginalName`           | The basename reported by Photos. May include `_edited`.               |
| `.<ext>`                 | Real on‑disk extension: `jpg`, `jpeg`, `png`, `heic`, `mov`, `mp4`, … |

### Rationale

- A single, sortable string unifies stills _and_ videos.
- Keeping the true extension (`.<ext>`) avoids MIME ambiguities and lets web
  servers set the correct `Content‑Type`.
- The `_edited` suffix that Photos appends after rotation or adjustment is
  preserved so users can still distinguish edited variants.

### Backwards compatibility

Older exports contained `.jpg` only. Those paths remain valid on disk but will
not be generated after **v2.0**. Remove caches in `backend/data/albums/*/images`
before re‑exporting if you want a fully‐uniform set.
