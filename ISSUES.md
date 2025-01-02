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

Even though the backend returns `persons` as included data when fetching an album, they do not appear in the UI. In Ember Inspector, we see `album.persons` is present, but on the active controller, `persons` remains empty because the PromiseManyArray was not awaited before use.

### Actions

- In `app/routes/albums/album.js`, awaited `album.persons` before mapping/filtering.
- Once verified and tested, we can mark this issue resolved.

### Next Steps

- Verify persons now appear as expected.

---

## New Issue: `photoPersonNames` Always Empty in Controller

**Opened By:** [Your Name], Dec 15, 2024  
**Status:** **Open**

### Description

We’re trying to filter photos by selected persons. However, `photoPersonNames` in `albums/album.js` controller logging always returns an empty array. The reason seems to be that `photo.persons` is not properly populated with Person model instances. Even though we have `@hasMany('person')` defined, the `persons` data might be coming in as raw strings rather than proper JSON:API relationships.

### Proposed Frontend-Only Fix

We can create a custom serializer for `photo` on the frontend that transforms the raw `persons` attribute into proper JSON:API relationships. This ensures Ember Data recognizes the `persons` as PersonModel instances.

### Next Steps

- Implement a `photo.js` serializer in `app/serializers/photo.js` that modifies the `normalize` response, converting `persons` strings into relationship objects and (optionally) included person records.
- Test if `photo.persons` now returns actual Person models.
- Confirm that `photoPersonNames` is no longer empty.

---

## Performance Impact from Re-Fetching Large Albums on Sort/Filter Changes

**Opened By:** [Your Name], Dec 15, 2024  
**Status:** Open

### Description

Changing sorting/filtering previously caused large album re-fetches, leading to delays. We implemented front-end-only sorting and filtering to avoid unnecessary re-fetches.

### Actions

- Moved sorting and filtering logic to the frontend.
- Initial load might be slower, but subsequent operations are fast.

### Next Steps

- Consider indexed DB, cache invalidation strategies, pagination, or lazy loading for scalability.
- Monitor performance and refine as needed.

---

## Issue 19: Chrome "Aw, Snap!" Crash on Large Albums

**Opened By:** [Your Name], Dec 21, 2024  
**Status:** **Resolved**

### Description

When an album contains a very large number of photos (hundreds or thousands), Chrome sometimes crashes with an “Aw, Snap!” error code 5. This typically indicates the browser is running out of memory or hitting some resource limit.

### Resolution

- **Implemented a default limit (e.g., 200 photos) when requesting an album** to prevent the UI from trying to render or sort thousands of photos at once.
- Added a `limit` query param so advanced users can pull more photos if needed (with caution).

### Next Steps

- For truly large datasets, implement full pagination instead of a single “limit” slice.
- Monitor memory usage when increasing `limit`.

---

## Issue 20: Persistent "Cannot read properties of undefined (reading 'bind')" Error

**Opened By:** [Your Name], Jan 1, 2025  
**Status:** **Open**

### Description

We continue to see this console error in Chrome:

Uncaught (in promise) TypeError: Cannot read properties of undefined (reading ‘bind’)
at OnModifierState.updateListener (ember.js:6590:1)
…

Even after replacing `(on "click" ...)` with classic `{{action}}` in certain templates and removing potential `(fn)` usage, the error persists. Our attempts have included:

1. Converting to older style event handlers (i.e., `{{action "someMethod"}}`).
2. Removing or replacing `(on "eventName" this.someMethod)` wherever found.
3. Making sure all referenced actions are actually defined.

Yet the runtime error about `.bind` remains in the stack trace, pointing to `OnModifierState.updateListener` inside Ember’s internals.

### Steps We’ve Taken

- Searched for any leftover `(on ...)` usage in templates or angle-bracket components.
- Checked for `onsubmit`, `onclick`, or other direct event bindings that might be undefined.
- Ensured that each action or handler is defined (no `undefined` methods).
- Cleaned caches, restarted the Ember server, and done a hard browser reload.

### Next Steps / Open Questions

- **Is there a hidden or implicit usage of `{{on}}` in a third-party library or an addon** that is out of date?
- **Could a mismatch of Ember versions be causing `{{on}}` to fail** unexpectedly? We may need to confirm our app’s Ember version compatibility with the `on` or `fn` helpers.
- Investigate the Ember Inspector’s “Components” or “Routes” tabs to see if any components are auto-generated that might rely on `(on)`.
- If needed, log an Ember issue or check official Ember Slack for reports of `on` usage throwing `.bind` errors in certain versions.

### Action Items

1. **Search** the entire codebase for all `(on "` references (including `node_modules` if necessary).
2. **Verify** installed Ember version in `package.json` and ensure we don’t have conflicting addon versions that might break the built-in `on` modifier.
3. **Try** using a minimal reproduction app (create a fresh Ember project, replicate our steps) to see if the error occurs with our code or if the problem is project-specific.
