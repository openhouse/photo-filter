# Development Plan

### December 14, 2024: Tailwind & DaisyUI Integration Update

**Decision & Implementation:**

- Removed `@import` of Tailwind CSS files in `app.scss` and replaced them with:
  ```scss
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

## Update: Transition to Query-Param-Based Faceted Person Filtering

**Date:** December 12, 2024

### Decision

- Move from nested person-specific routes toward a unified album route that uses query parameters to filter by selected individuals.
- The UI will display a list of people in the left navigation under the currently active album. Users can toggle individuals on or off (via checkboxes or links), and the album’s displayed photos will filter to include only photos with all selected individuals.
- Remove the separate "View People in this Album" link and the “Back to Albums” link, as album navigation and person filtering are now integrated in the left nav.
- Eventually incorporate a front-end UI framework (like Bootstrap or Material Design) for a more cohesive look and feel.

### Rationale

- **Integrated Navigation**: Having all filtering (by album, by people) and sorting in one unified route simplifies the user experience.
- **Improved UX**: No need to navigate to a separate persons sub-route. People-based filtering is just another facet of the main album view.
- **Scalability**: Query params enable easy multi-person filtering. As the user selects multiple names, they appear in the URL’s query params, making the filtering state shareable and bookmarkable.
- **Future-Ready**: Paves the way to easily add other facets (like tags, locations, or events) as query-parameter-based filters.

### Implementation Steps

1. **Remove Person Sub-Routes**:

   - No longer need `albums/album/persons` or `albums/album/persons/person/:person_name`.
   - Instead, retrieve people from `GET /api/albums/:albumUUID/persons` and display them under the selected album in the left nav.

2. **Update Album Route to Use Query Params**:

   - Add a `people` query param to `albums.album`.
   - When a user toggles a person in the UI, update the `people` query param to reflect the currently selected individuals.
   - Filter photos based on the intersection of all selected individuals’ sets of photos.

3. **UI Updates**:

   - The left nav becomes scrollable and fixed in height, independent from the main content area.
   - Display the currently selected album title, below it a list of people. Each name toggles inclusion in the `people` filter.
   - No need for “Back to Albums” or “View People in This Album” links—navigation and filtering are seamlessly integrated.

4. **Backend**:

   - The backend remains largely the same. The frontend can still fetch all people via `GET /api/albums/:albumUUID/persons`.
   - For multiple individuals, the frontend will combine their names and request photos containing all of them, or request the full set and filter on the client side if needed. (Future optimization may be added on the backend.)

5. **Documentation**:

   - Update `DEVELOPMENT_PLAN.md`, `ISSUES.md`, and `README.md` to reflect the new approach.
   - Document how query parameters represent the filtering state.

6. **Testing and Validation**:
   - Ensure that selecting multiple individuals updates the displayed photos correctly.
   - Confirm that query params can be bookmarked and reloaded.
   - Test sorting combined with person-based filtering.

### Potential Challenges

- **Complex Filtering**: As multiple people are selected, performance could degrade for large albums. Consider caching or indexing if needed.
- **UI Complexity**: Need a clear indication of which people are currently selected and how to reset filters.
- **Backwards Compatibility**: Removing person sub-routes may require updating links or references.

---

## Previous Updates

- **December 7, 2024**: Initial person-level sub-routes conceived.  
  _Note:_ This approach is now evolving into a unified, query-param-based filter.
- **November 12, 2024**: Introduced nested routes, left nav, and sorting.
- **November 1, 2024**: Added cache invalidation for data freshness.
- **October 30, 2024**: Adopted JSON:API serializer.

---

## Project Goal

Create an intuitive, facet-based photo exploration tool integrated with macOS Photos data, enabling advanced sorting, selection, exporting, and multi-person filtering.

## Current State

- **Frontend**: Ember.js with album-level sorting, person-based filters pending refinement.
- **Backend**: Express.js, JSON:API, data from `osxphotos`.
- **Data Handling**: `osxphotos` extracts metadata.
- **Selection & Export**: In progress.
- **Documentation & Styling**: Ongoing enhancements.

## Next Steps

1. **Implement Multi-Person Filtering with Query Params**:

   - Refactor UI to remove separate person routes.
   - Add toggles in the left nav.
   - Update the album route’s model hook to factor in `people` query param.

2. **Improve Export Feature**:

   - Integrate actual export logic on the backend.
   - Show feedback to the user during export operations.

3. **UX and Performance**:

   - Consider a UI framework for styling.
   - Explore caching large album queries.

4. **Testing & Quality Assurance**:

   - Test multi-person filtering thoroughly.
   - Validate sorting and selection persistence.

5. **Documentation & Cleanup**:
   - Keep all documentation updated.
   - Refactor code for maintainability.

---
