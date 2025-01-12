# Development Plan

### December 14, 2024: Tailwind & DaisyUI Integration Update

**Decision & Implementation:**

- Removed `@import` of Tailwind CSS files in `app.scss` and replaced them with:
  ```scss
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

### Update: Transition to Query-Param-Based Faceted Person Filtering

**Date:** December 12, 2024

**Decision:**

- Move from nested person-specific routes toward a unified album route that uses query parameters to filter by selected individuals.
- The UI will display a list of people in the left navigation under the currently active album. Users can toggle individuals on or off (via checkboxes or links), and the album’s displayed photos will filter to include only photos with all selected individuals.
- Remove the separate “View People in this Album” link and the “Back to Albums” link, as album navigation and person filtering are now integrated in the left nav.
- Eventually incorporate a front-end UI framework (like Bootstrap or Material Design) for a more cohesive look and feel.

**Rationale:**

- **Integrated Navigation:** Having all filtering (by album, by people) and sorting in one unified route simplifies the user experience.
- **Improved UX:** No need to navigate to a separate persons sub-route. People-based filtering is just another facet of the main album view.
- **Scalability:** Query params enable easy multi-person filtering. As the user selects multiple names, they appear in the URL’s query params, making the filtering state shareable and bookmarkable.
- **Future-Ready:** Paves the way to easily add other facets (like tags, locations, or events) as query-parameter-based filters.

**Implementation Steps:**

1. **Remove Person Sub-Routes**  
   No longer need `albums/album/persons` or `albums/album/persons/person/:person_name`.
2. **Update Album Route to Use Query Params**  
   Add a `people` query param to `albums.album`, update toggles, etc.
3. **UI Updates**  
   People filters appear in the left nav, integrated with album listing.
4. **Backend**  
   The backend remains largely the same. For multi-person queries, client-side filtering is primary; future server optimization possible.
5. **Documentation**  
   Update relevant docs: `DEVELOPMENT_PLAN.md`, `ISSUES.md`, `README.md`.
6. **Testing and Validation**  
   Confirm query params work and that reloading with persons in the URL is stable.

**Potential Challenges:**

- Complex filtering for large libraries might need caching or indexing.
- UI complexity if many persons are toggled.

---

### Previous Updates

- **December 7, 2024**: Initial person-level sub-routes conceived.
- **November 12, 2024**: Introduced nested routes, left nav, and sorting.
- **November 1, 2024**: Added cache invalidation for data freshness.
- **October 30, 2024**: Adopted JSON:API serializer.

---

## Project Goal

Create an intuitive, facet-based photo exploration tool integrated with macOS Photos data, enabling advanced sorting, selection, exporting, and multi-person filtering.

---

## Current State

- **Frontend**: Ember.js with album-level sorting and filtering done on the frontend for performance.
- **Backend**: Express.js, JSON:API, data from `osxphotos`.
- **Data Handling**: `osxphotos` extracts metadata; `photos.json` captures results for each album.
- **Selection & Export**: In progress.
- **Documentation & Styling**: Ongoing enhancements.

---

## Next Steps

1. **Implement Multi-Person Filtering with Query Params**  
   Completed the initial approach; further refinements ongoing.
2. **Improve Export Feature**  
   Integrate actual export logic on the backend, plus UI feedback during export.
3. **UX and Performance**  
   Potentially add an indexed DB or partial caching for large datasets; also set up a refresh route.
4. **Testing & Quality Assurance**  
   Strengthen acceptance tests (e.g. `person-filtering-test.js`).
5. **Documentation & Cleanup**  
   Keep all docs updated; refactor code for maintainability.

---

## Cinematic Montages and Artistic Workflow

With the emerging cinematic use cases (see `CINEMATIC-VISION.md` for deeper discussion):

- **Facilitating “Short Films”**  
  Users often drag out ~150 images, place them into an external video editor (Final Cut Pro or similar), and generate micro-animations or time-lapse sequences. Our sorting by aesthetic score or by recognized faces can help them find key frames or ensure coverage of all event participants.

- **Montage Tools**  
  While advanced timeline editing is best left to specialized video software, the Photo Filter app can provide “proto-montage” capabilities:

  - Exporting images in a “chronological yet selective” order.
  - Tagging or marking intervals for quick selection in FCPX.
  - Potential future feature: “mini-sequence preview,” letting the user quickly flip through frames in the app (like a mechanical film editor’s spool).

- **Long-Term Vision**
  - Possibly integrate a “Montage Editor” overlay in the Ember frontend for a quick drag-and-drop sequence.
  - Provide “story arc” filters (e.g., stable lighting vs. highly varied frames).
  - Output an “XML timeline” or JSON for direct import into editing software.

This alignment of photography with micro-cinema underscores our commitment to bridging the still and moving image realms. By continuing to refine filtering and selection tools, we enable both everyday photographers and fine-art practitioners to unearth new narrative possibilities.
