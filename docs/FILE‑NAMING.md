# File‑naming rules (v2 – UTC)

| Version | Prefix example                      | Meaning                       |
| ------- | ----------------------------------- | ----------------------------- |
| v1      | 20250531‑134503000000‑DSCF7309.jpg  | Local camera time             |
| **v2**  | 20250531T174503000000Z‑DSCF7309.jpg | **UTC**, micro‑second precise |

**How it works**

1. Read `DateTimeOriginal` (or Create/Modify).
2. Combine with `SubSecTimeOriginal` – always 6 digits.
3. Read `OffsetTimeOriginal`; if absent fall back to `OffsetTime`, else system zone.
4. Convert to UTC and format `YYYYMMDDTHHMMSSffffffZ`.
5. Prepend to original filename.

This guarantees that lexicographic sorting == true chronological order even
when different cameras were set to different time‑zones or daylight‑saving rules.
