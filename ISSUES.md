# Issues and Resolutions

This file logs open issues and their statuses. Update it as new issues arise and existing ones progress.

---

## Issue 16: PostCSS "File not found: /app/styles/app.css" Error

**Opened By:** Jamie, Dec 14, 2024  
**Status:** In Progress

### Description

Encountered a build error because PostCSS didn’t find `app.css` after SCSS changes.

### Actions

- Installed `ember-cli-sass` to compile `app.scss` into `app.css`.
- Updated `app.scss` to use `@tailwind` directives instead of `@import`.
- (Alternative) Renamed `app.scss` to `app.css` and removed `ember-cli-sass`.

### Next Steps

- Verify build succeeds (`ember serve`).
- If successful, mark as Resolved after testing in production-like scenarios.

---

## Issue 15: Nested Routes Not Rendering Child Templates

**Opened By:** [Your Name], Nov 12, 2024  
**Status:** **Resolved**

### Description

`albums/album` route’s template not rendering correctly.

### Resolution

- Added `{{outlet}}` to `albums.hbs`.
- Verified proper rendering.

---

## Issue 14: 404 Error When Fetching Album Data

**Opened By:** [Your Name], Nov 10, 2024  
**Status:** **Resolved**

### Description

`GET /api/albums/:albumUUID` returned 404.

### Resolution

- Implemented `GET /api/albums/:albumUUID`.
- Confirmed endpoint now works as expected.

---

## Issue 8: Implementing Interactive Photo Selection and Persistence

**Opened By:** [Your Name], Oct 27, 2024  
**Status:** **In Progress**

### Description

Need multi-photo selection persistence across sorting and filtering changes.

### Actions

- Created `selection.js` service to manage selected photos.
- Selections persist when changing sort order or navigating within the album.

### Next Steps

- Integrate with multi-person filtering now that filtering is query-param-based.
- Ensure that selected photos remain selected as users toggle people filters.
- Write more comprehensive tests for selection persistence.

---

## Issue 9: Adding Actions for Selected Photos (Export Functionality)

**Opened By:** [Your Name], Oct 27, 2024  
**Status:** **In Progress**

### Description

Need to export selected photos from the backend once chosen on the frontend.

### Actions

- Created `/api/photos/export` endpoint.
- Frontend can send selected photo IDs to initiate export.
- Basic user alerts implemented to inform the user of export status.

### Next Steps

- Implement actual export logic on the backend.
- Add progress indicators (e.g., a progress bar) in the UI.
- Validate that exported filenames handle duplicates properly.

---

## Issue 16: Filename Collisions in Exports

**Opened By:** [Your Name], Dec 11, 2024  
**Status:** **Open** (Reopened Dec 12, 2024)

### Description

When exporting images, sometimes duplicate filenames occur.

### Current Approach

- Prepend date/time to filenames.
- Append counters for duplicates.

### Next Steps

- Confirm that this approach truly prevents collisions.
- Test extensively in a real environment before marking resolved.

---

## Newly Considered Issue: Replacing Person Sub-Routes with Query Params

**Opened By:** [Your Name], Dec 12, 2024  
**Status:** **In Planning**

### Description

We initially implemented `albums/album/persons` sub-routes. We now want to remove them in favor of query params on the main album route. This will unify navigation and filtering, removing the need for “Back” or “View People” links.

### Actions

- Update `DEVELOPMENT_PLAN.md` to reflect query-param-based person filtering.
- Adjust frontend UI to list people under the album in the left nav.
- Remove old person sub-route code once the new system is tested.

### Next Steps

- Implement toggles for people in the sidebar.
- Update the album route model hook to filter photos by selected people.
- Fully test the new approach.

---

## Issue 17: Persons Not Appearing in Album UI

**Opened By:** [Your Name], Dec 13, 2024  
**Status:** **Open**

### Description

Even though the backend returns `persons` as included data when fetching an album, they do not appear in the UI. In Ember Inspector, we see that `album.persons` is present, but on the active controller, `persons` remains empty. This occurs because `album.persons` is a PromiseManyArray and must be awaited before using its data. Without awaiting, the code tries to read `persons` before they are fully loaded, resulting in an empty array being used for the UI.

### Actions

- In `app/routes/albums/album.js`, await the `album.persons` before mapping or filtering.
  For example:
  ```js
  const loadedPersons = await album.persons;
  const allPersons = loadedPersons.map((person) => person.name);
  ```

Next Steps
• Make this code change and verify that persons now appear in the UI as expected.
• Once verified and tested in reality, mark this issue as resolved.

New Issue: Performance Impact from Re-Fetching Large Albums on Sort/Filter Changes

Opened By: [Your Name], Dec 15, 2024
Status: Open

Description

When changing sorting attributes or toggling person filters, the app previously made new API requests to the backend for all ~25k photos in the album. This caused a significant performance delay (around 30 seconds). We decided to implement front-end-only sorting and filtering to avoid unnecessary re-fetches, improving responsiveness.

Actions
• Shifted sorting and filtering logic entirely to the frontend.
• Now the dataset is loaded once, and all sorting/filtering occurs in memory.
• This approach drastically reduces delays after the initial load.

Next Steps
• Consider adding a backend index database to handle larger datasets more efficiently in the long term.
• Implement a backend apple-photos-library cache invalidation logic so we know when our cached data is stale and needs re-fetching from Apple Photos.
• Improve monitoring and consider pagination or lazy loading if dataset grows even larger.

Note: No issue should be marked resolved until verified in reality. Keep documenting any uncertainties or performance concerns.
