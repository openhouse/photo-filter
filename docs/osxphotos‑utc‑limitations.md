# Why we ship our **own** `to_utc` filter

### The problem

- **`created_utc` does not exist** – the official osxphotos template
  substitutions only provide the “local‐time” family (`{created}`,
  `{modified}`, `{added}`, …).

- **There is no built‑in `|utc` filter** – the stock filter list
  (`lower`, `upper`, `shell_quote`, `replace`, …) ends there.
  Attempting to use `|utc` raises  
  `SyntaxError: Unknown filter: utc`.

This applies to all **0.72.x** releases (latest at time of writing).

### Why we care

File‑name prefixes must be **globally sortable**.  
If two cameras (or one traveller) shoot in different time‑zones the naïve
local stamps will interleave incorrectly:

```

20250103T080000‑img1.jpg   # New York local (UTC‑5)
20250103T081500‑img2.jpg   # already London local (UTC+0)

```

### Our solution

1. **Custom filter** `backend/utils/osxphotos_filters.py::to_utc`  
   Converts any naive or offset‑aware `datetime` to timezone‑aware UTC.

2. **Template**

   ```text
   {created|to_utc.strftime,"%Y%m%dT%H%M%S%fZ"}-{original_name}
   ```

3. **CLI flag**

   ```bash
   --filter "to_utc:backend.utils.osxphotos_filters:to_utc"
   ```

4. **Runtime import path**
   `backend/utils/export-images.js` prefixes `PYTHONPATH` with the
   _backend_ directory so osxphotos can locate the new module.

The resulting filenames look like:

```
20250531T174503000123Z‑DSCF7309.jpg
```

- micro‑second precision (`%f`)
- guaranteed **UTC** (`Z`)
- lexicographic == chronological across all cameras

---

_Last updated: 2025‑06‑17_
