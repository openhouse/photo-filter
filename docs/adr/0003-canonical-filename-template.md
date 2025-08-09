# ADR-0003: Canonical export filename template

## Status
Accepted — 2025-08-09

## Context
We need filenames whose lexicographic order matches capture chronology across mixed devices. Our post workflows (film/animation) require this property.

## Decision
Adopt `{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}{ext}` as the canonical filename template, applied via osxphotos in the backend indexer.

- Use UTC time (not local).
- Include microseconds for extra ordering stability.
- Preserve the original file extension by default; optionally normalize JPEG via `JPEG_EXT`.
- When collisions occur, choose winner by area → file size → prefer non-RAW → UUID; store all UUIDs in collisions file.

## Consequences
- Sorting by filename yields the timeline.
- Exporters and any path-based tools must use the same template (or explicitly opt out).
- Changes must go through a follow-up ADR and synchronized code/docs updates.

## Change control
Template changes require:
1. ADR update
2. `.env.example` update
3. README & backend/README update
4. Python builder default update
5. Passing the template through from Node → Python
6. Template consistency check updated
