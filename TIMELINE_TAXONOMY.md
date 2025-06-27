# TIMELINE_TAXONOMY.md

## Purpose

This document describes our upcoming feature for a time-based navigation tree in the Photo Filter Application. We aim to let the user drill into Years → Months → Weeks → Days, but **only** for nodes that actually contain photos. This dynamic approach ensures we don’t clutter the UI with empty categories.

## Scope of the Feature

1. **Comprehensive Metadata Export**

   - We will export all available date/time metadata for each photo.
   - This may require a one-time or periodic “full scan” of the Apple Photos library to create an internal database/table for efficient lookups.

2. **Hierarchical Time Tree**

   - **Years**: Display each year that has at least one photo.
   - **Months**: Nested under each year, only show months that have photos.
   - **Weeks**: Potentially optional, but we’re considering an ISO week definition (e.g., week #1 is the week with Jan 4).
   - **Days**: Nested under each month or week, only if photos exist.

3. **UI/UX Goals**

   - **Left Nav Tree**: The user sees a collapsible tree (like a folder structure).
   - **Multi-Select**: The user can shift-click or ctrl/cmd-click multiple time nodes (e.g., 2024 + “December 12, 2024”).
   - **Album-Like Grid**: All selected nodes are combined into a single photo feed on the right side, akin to how we handle multi-person filtering.

4. **Backend/Database Changes**

   - We’ll likely store a separate table or index keyed by date (year, month, day). Possibly more columns for week or combined date parts.
   - Queries need to handle multiple disjoint sets of date criteria (like multiple days across multiple months).

5. **Performance Considerations**

   - We might have 100k+ photos. Building the entire tree on the fly could be slow.
   - Precompute or incrementally update a time index so the UI can quickly load partial aggregates.

6. **Multi-Level Selection**

   - **Example**: The user clicks “2024” in the tree → sees 7,000 photos for 2024 in the main area.
   - Then they expand “December 2024,” see each day. They select “December 7” and “December 8,” which refines the main area to 250 photos from just those days.
   - They can also simultaneously keep “2024” selected to add all of 2024. Or they can uncheck “2024” if they only want the two days.

7. **Integration with Person / Location Filters**

   - This time-based approach will integrate with the existing query-param-based filtering. So the user can do `dates=2024-12-07,2024-12-08` plus `persons=Margaret,Douglas` plus `locations=Vienna,Cambridge`.
   - In Ember, we might handle multiple query params or a combined param. This is still open for discussion.

8. **Roadmap**
   1. Build out the data structure for a “time index” in the backend.
   2. Extend the existing Ember app to add a Time nav section (like we do for People).
   3. Implement multi-select checkboxes or toggles for each date node.
   4. Combine the logic so that the final photo grid merges all selected times with any selected people, location, or aesthetic filters.

## Example JSON Snippet

We might store or return data like:

```json
{
  "years": [
    {
      "year": 2022,
      "months": [
        {
          "month": 5,
          "days": [12, 13, 18]
        }
      ]
    },
    {
      "year": 2024,
      "months": [
        {
          "month": 12,
          "weeks": [49, 50],
          "days": [7, 8, 9, 15, 30]
        }
      ]
    }
  ]
}
```

Note: **Whether** we nest weeks inside months or keep them separate is still under consideration.

## Next Steps

- Update `DEVELOPMENT_PLAN.md` to reference this approach.
- Start building actual endpoints that return the “time index.”
- Add a left nav UI in Ember that can request and display this index, with multi-select capability.

---

_Last updated: 2025-01-12_
