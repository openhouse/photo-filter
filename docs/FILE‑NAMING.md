# File‑naming convention (v2 — UTC)

**Pattern**

```

YYYYMMDDTHHMMSSffffffZ-{original\_name}.jpg
│        │ │     │ │
│        │ │     │ └── 6‑digit micro‑seconds (zero‑padded)
│        │ │     └──── Seconds
│        │ └────────── Hours & minutes
│        └──────────── Literal “T” separator
└────────────────────── Date in UTC

```

Example (31 May 2025, 17:45:03.000000 UTC):

```

20250531T174503000000Z-DSCF7309.jpg

```

**Why UTC?**

- Eliminates cross‑body drift when photographers forget to set the correct
  local TZ.
- Guarantees strict lexical = chronological sorting.
- Unequivocal at ingest time; downstream tools never need to guess offsets.

**How it is produced**

The exporter now calls **osxphotos** with:

```
--filename "{created_utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}"
```

`created_utc` is supplied by Photos and already normalised to UTC; micro‑second
precision (`%f`) prevents collisions even on burst shots.

The frontend/server rebuilds the same prefix via
`formatPreciseTimestamp(photo.date, photo.tzoffset)` so internal URLs line up
with the physical file names.

**Upgrading**

If you still have older `YYYYMMDD-HHMMSSffffff-…` files, simply delete
`backend/data/albums/*` and trigger a fresh export.
