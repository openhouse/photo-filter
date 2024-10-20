# Development Plan

## Project Goal

Develop a locally running web application that interfaces with the user's macOS Photos library to allow interactive querying, filtering, and exporting of photos based on Apple's aesthetic scores and other metadata.

## Current State

- **Data Extraction**: Implemented using `osxphotos` via a Python virtual environment.
- **Image Export**: Top N photos are exported and stored in `data/images-source`.
- **Backend**: Express.js server with routes that handle data processing and querying.
- **Frontend**: Handlebars templates displaying photos and scores.
- **Styling**: Basic CSS styling using SCSS.

## New Objectives

- **Interactive Querying**: Enable users to compose queries using various photo attributes and metadata.
- **Album Selection**: Allow users to select specific albums from their Photos library for filtering.
- **Attribute Facets**: Provide facets for attributes like aesthetic scores, date ranges, keywords, people, and more.
- **Photo Export**: Facilitate exporting or copying filtered photos to a local directory.
- **Privacy Considerations**: Ensure personal data and photos are not included in the git repository.

## Pending Tasks and Priorities

1. **High Priority**

   - **Album Selection Interface**:

     - Implement a UI component to select albums from the Photos library.
     - Modify the backend to handle album-specific queries.

   - **Interactive Query Builder**:

     - Develop a query builder interface allowing users to filter photos using facets.
     - Include attributes like aesthetic scores, dates, keywords, and people.

   - **Dynamic Photo Export**:

     - Implement functionality to export or copy filtered photos to a user-specified local directory.
     - Ensure compatibility with applications like Adobe Photoshop's Photomerge.

   - **Enhanced Error Handling**:
     - Improve error messages and handling throughout the application.
     - Provide informative feedback to the user in case of failures.

2. **Medium Priority**

   - **Responsive Design**:

     - Update the frontend to be fully responsive and mobile-friendly.
     - Use media queries and flexible layouts.

   - **Caching and Performance**:
     - Implement caching mechanisms for photo metadata to reduce load times.
     - Optimize queries and data processing for large datasets.

3. **Low Priority**

   - **Advanced Filtering Options**:

     - Include additional filters like location, camera model, and EXIF data.
     - Allow sorting by subjective evaluation attributes from Apple's enhanced attributes.

   - **User Preferences**:

     - Save user settings and preferences for queries and interface configurations.

   - **Internationalization (i18n)**:
     - Prepare the application for localization and support multiple languages.

## Next Steps

- **Backend Enhancements**:

  - Modify `photoController.js` to handle album-specific queries and dynamic filtering.
  - Integrate additional metadata attributes into the querying mechanism.

- **Frontend Development**:

  - Update `index.hbs` and `main.hbs` to include interactive query builder components.
  - Use AJAX or Fetch API for dynamic content loading without full page refreshes.

- **Export Functionality**:

  - Implement a feature to export filtered photos to a local directory.
  - Ensure the exported photos retain necessary metadata for external applications.

- **Privacy and Data Management**:

  - Update `.gitignore` to exclude any personal data or photo files.
  - Ensure temporary caches and exported data are stored securely on the user's local machine.

- **Documentation Updates**:
  - Update `README.md` and `project-guidelines.md` to reflect new features and usage instructions.
  - Include information about privacy considerations and data handling.

## Collaboration Notes

- Any changes to the core functionality should be documented in `CHANGELOG.md`.
- Follow the **Project Guidelines** outlined in `project-guidelines.md`.
- Use descriptive commit messages and maintain code quality.
- Ensure that all critical information is included within project files for continuity.

---

_This development plan should be updated as tasks are completed and new priorities emerge._
