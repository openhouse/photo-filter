# Issues and Resolutions

This file serves as a log of open issues, debugging steps taken, and resolutions. It's intended to facilitate collaborative problem-solving and prevent redundant efforts.

---

## Issue 15: Nested Routes Not Rendering Child Templates

**Opened By:** [Your Name] on Nov 12, 2024

**Status:** **Resolved**

### Description

The `albums/album` route was not rendering its template within the `albums` route as expected. Clicking on an album link did not display the album's photos.

### Error Observed

- The child route's template was not rendering within the parent route's template.

### Resolution

- **Root Cause:** The `albums.hbs` template lacked an `{{outlet}}`, which is necessary for rendering nested routes in Ember.js.
- **Solution:** Added an `{{outlet}}` to `app/templates/albums.hbs`.
- **Commit:** Added outlet to `albums.hbs` to render album content and updated styles.

### Action Items

- Updated `albums.hbs` to include `{{outlet}}`.
- Restructured the template to include a left navigation column and content area.
- Restarted the Ember server to apply changes.
- Verified that the child route's content renders correctly.

---

## Issue 14: 404 Error When Fetching Album Data in Ember.js Application

**Opened By:** [Your Name] on Nov 10, 2024

**Status:** **Resolved**

### Description

The Ember.js application encountered a 404 Not Found error when attempting to fetch album data from the endpoint `/api/albums/:albumUUID`.

### Resolution

- **Root Cause:** The backend API did not have an endpoint to handle GET requests to `/api/albums/:albumUUID`.
- **Solution:** Implemented the missing endpoint on the backend to handle GET requests to `/api/albums/:albumUUID`.
- **Commit:** Implemented backend endpoint for fetching single album data.

---

## Issue 8: Implementing Interactive Photo Selection and Persistence

**Opened By:** [Your Name] on Oct 27, 2024

**Status:** **In Progress**

### Description

We need to implement the ability for users to select multiple photos by clicking and dragging the mouse over them. Selections should persist as users switch between different sorting attributes.

### Action Items

- **Create Selection Service:** Implemented `app/services/selection.js` to manage selection state.
- **Update Photo Grid:** Modified `albums/album.hbs` to handle photo selection and display selected state.
- **Implement Selection Persistence:** Ensure that selections persist across sorting and navigation.

### Next Steps

- **Expand Selection Feature:** Implement functionality to include photos taken immediately before and after selected photos.
- **Testing:** Write tests to ensure selection works as expected.

---

## Issue 9: Adding Actions for Selected Photos

**Opened By:** [Your Name] on Oct 27, 2024

**Status:** **In Progress**

### Description

Allow users to perform actions on the selected photos, such as exporting them to a directory.

### Action Items

- **Backend API Endpoint:** Created `/api/photos/export` to handle exporting photos.
- **Frontend Integration:** Updated `albums/album.js` to send selected photo IDs to the backend.
- **User Feedback:** Added alert messages to inform users about the export status.

### Next Steps

- **Implement Actual Export Logic:** Complete the backend function to export photos.
- **Enhance User Feedback:** Provide better UI notifications and progress indicators.

---

## Issue 16: Filename Collisions When Reconstructing Directory Structure

**Opened By:** [Your Name] on Dec 11, 2024

**Status:** **Resolved**

### Description

Previously, when exporting images from Apple Photos to a flat directory structure, multiple images shared the same `original_name` (e.g., `DSCF1191.jpg`) leading to collisions and confusion. This happened because we lost the original directory context and ended up with multiple files named identically.

### Resolution

- **Chosen Solution**: Prepend the date/time the photo was taken (derived from EXIF or `photos.json` metadata) to the filename.
- **Format**: `YYYYMMDD-HHMMSS-OriginalFilename.jpg`
- **Example**: `20241209-215443-DSCF1191.jpg`

This ensures chronological sorting by filename and reduces the risk of collisions. In the rare event of a collision (multiple photos taken at the exact same second with the same original name), we append a counter (`-1`, `-2`, etc.) until we find a unique name.

### Actions Taken

- Implemented a post-export step in `photos-controller.js` that:
  1. Reads the `date` field from each photo in `photos.json`.
  2. Formats the date/time as `YYYYMMDD-HHMMSS`.
  3. Renames the exported `original_name.jpg` file to include the date/time prefix.
  4. Checks for collisions and resolves them by incrementing a counter if needed.

### Outcome

With this new naming scheme, sorting by filename in a file browser reflects the chronological order of when photos were taken, and file collisions are prevented.

---

# End of Issues Log
