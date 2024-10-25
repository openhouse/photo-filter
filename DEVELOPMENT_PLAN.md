# Development Plan

## Project Goal

Develop a locally running web application that interfaces with the user's macOS Photos library to allow interactive querying, filtering, and exporting of photos based on Apple's aesthetic scores and other metadata.

## Current State

- **Data Extraction**: Implemented using `osxphotos` via a Python virtual environment.
- **Image Export**: Functioning correctly after resolving export issues.
- **Backend**: Express.js server with routes handling album and photo data.
- **Frontend**: Handlebars templates displaying albums and photos.
- **Styling**: Basic CSS styling using SCSS.
- **Issue Tracking**: `ISSUES.md` added for documenting issues and resolutions.

## New Objectives

- **Interactive Album Navigation**: Enable users to navigate and select albums from their Photos library within the web app.
- **Enhanced Sorting and Filtering**: Allow sorting and filtering of photos by attributes like aesthetic scores, dates, keywords, and people.
- **Symlinked Photo Export**: Facilitate exporting filtered photos as symlinks to a structured directory compatible with Photoshop's Photomerge.
- **Export Directory Structure**: Organize exports under `exports/yyyy-mm-dd/named_export/`, containing symlinks to the original images.
- **Privacy Considerations**: Ensure personal data and photos are not included in the git repository.

## Pending Tasks and Priorities

### 1. High Priority

- **Interactive Album Navigation**:

  - Implement a UI component to display and select albums from the Photos library.
  - Modify the backend to fetch and serve album-specific data.

- **Enhanced Sorting and Filtering**:

  - Develop sorting and filtering mechanisms based on photo attributes.
  - Update the frontend to allow users to apply these filters interactively.

- **Symlinked Photo Export**:

  - Implement functionality to create symlinks of filtered photos in a user-defined export directory.
  - Ensure the symlinks point to the original images in the Photos library without copying files.
  - Handle potential issues with iCloud Photo Library and ensure symlinks work correctly.

- **Export Directory Structure**:

  - Automate the creation of export directories following the `exports/yyyy-mm-dd/named_export/` format.
  - Provide a UI for users to name their exports.

- **Enhanced Error Handling**:
  - Improve error messages and handling throughout the application.
  - Provide informative feedback to the user in case of failures.

### 2. Medium Priority

- **Responsive Design**:

  - Update the frontend to be fully responsive and mobile-friendly.
  - Use media queries and flexible layouts.

- **Caching and Performance**:
  - Implement caching mechanisms for photo metadata to reduce load times.
  - Optimize queries and data processing for large datasets.

### 3. Low Priority

- **Advanced Filtering Options**:

  - Include additional filters like location, camera model, and EXIF data.
  - Allow sorting by other subjective evaluation attributes from Apple's enhanced attributes.

- **User Preferences**:

  - Save user settings and preferences for queries and interface configurations.

- **Internationalization (i18n)**:
  - Prepare the application for localization and support multiple languages.

## Next Steps

- **Implement Interactive Sorting and Filtering**:

  - Allow users to sort photos by aesthetic score, date, etc.
  - Update the frontend to include sorting/filtering UI components.

- **Symlinked Photo Export**:

  - Develop functionality to export selected photos as symlinks.
  - Ensure compatibility with Photoshop's Photomerge.

- **Enhance Documentation**:

  - Keep `ISSUES.md` updated with any new issues.
  - Continue refining `project-guidelines.md` as the project evolves.

- **Backend Enhancements**:

  - Implement functions to create symlinks in the specified export directory.
  - Ensure compatibility with the Photos library structure and handle any symlink limitations.

- **Frontend Development**:

  - Update `index.hbs` and `main.hbs` to include album navigation and filtering UI components.
  - Add forms or dialogs to allow users to specify export names.
  - Use AJAX or Fetch API for dynamic content loading without full page refreshes.

- **Privacy and Data Management**:

  - Update `.gitignore` to exclude any personal data or photo files.
  - Ensure temporary caches and exported data are stored securely on the user's local machine.

- **Testing and Quality Assurance**:
  - Write unit tests for new features.
  - Perform thorough testing to ensure stability.

## Collaboration Notes

- **Code Provisioning**:

  - Provide full files for any code changes to facilitate copy-paste replacement.
  - Organize the project into smaller files if necessary to improve manageability.

- **Communication**:

  - Include all critical information within project files for continuity.
  - Document any architectural decisions and code changes thoroughly.

- **Issue Tracking**:
  - Utilize `ISSUES.md` for logging problems and tracki
