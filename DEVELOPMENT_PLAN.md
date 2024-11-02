# Development Plan

## Update: Implementing Cache Invalidation Based on Timestamps

**Date:** November 1, 2024

### Decision

Implement cache invalidation based on timestamps to ensure the web application reflects the latest changes in the Apple Photos library.

### Rationale

- **Data Freshness**: Ensures users always see the latest albums and photos.
- **Performance**: Avoids unnecessary data regeneration, balancing performance with data freshness.

### Implementation Steps

1. **Create a Utility Function**:

   - Implement `getPhotosLibraryLastModified` to retrieve the last modified time of the Photos library.

2. **Update Backend Controllers**:

   - Modify `getAlbumsData` and `getPhotosByAlbumData` to check the last modified timestamps.
   - Regenerate cached data if the Photos library has changed.

3. **Testing**:

   - Test the implementation to ensure it correctly detects changes and updates cached data.

4. **Documentation**:

   - Update `README.md` and `project-guidelines.md` to reflect these changes.

### Potential Challenges

- **Accuracy of Timestamps**: Ensuring the last modified time accurately reflects changes within the library.
- **Edge Cases**: Handling situations where the Photos library changes without updating the last modified timestamp.
- **Performance Impact**: Monitoring any performance overhead introduced by checking timestamps.

---

## Previous Updates

## Update: Integration of JSON:API Serializer

- Decided to use `jsonapi-serializer` package on the backend to format API responses according to the JSON:API specification.
- Refactored the backend controllers to utilize the serializer, improving maintainability and compliance.
- Updated the package dependencies to include `jsonapi-serializer`.

---

## Project Goal

Develop a web application that interfaces with the user's macOS Photos library to enable interactive exploration, selection, and exporting of photos based on Apple's aesthetic scores and other metadata. The application aims to provide an engaging user experience by allowing users to select photos through intuitive interactions and perform actions like adding to albums or exporting selections.

## Current State

- **Data Extraction**: Implemented using `osxphotos` via a Python virtual environment.
- **Image Export**: Functioning correctly after resolving export issues.
- **Backend**: Express.js server with routes handling album and photo data.
- **Frontend**: Handlebars templates displaying albums and photos.
- **Styling**: Basic CSS styling using SCSS.
- **Issue Tracking**: `ISSUES.md` added for documenting issues and resolutions.

## New Objectives

- **Interactive Photo Selection**:

  - Implement the ability to select multiple photos by clicking and dragging the mouse over them.
  - Ensure selections persist as users switch between sorting attributes.
  - Allow users to collect selected photos from different sorting criteria.

- **Actions on Selected Photos**:

  - Provide options to add selected photos to a new or existing album in the Photos library.
  - Enable exporting selected images to a directory on the user's computer.
  - Organize new albums under a specific folder (e.g., "photo-filter") in the Photos library for encapsulation.

- **Enhanced Frontend Experience**:

  - Transition to an Ember.js frontend for better interactivity and responsiveness.
  - Use Express.js to serve API endpoints for data retrieval and actions.
  - Implement lazy loading of images to improve performance with large albums.

- **Roadmap Development**:

  - Set up a development roadmap outlining the transition to Ember.js and the implementation of new features.
  - Reimplement current features using the Ember.js frontend with Express.js as the API.
  - Expand the application with the new interactive features after the transition.

## Pending Tasks and Priorities

### 1. High Priority

- **Set Up Ember.js Frontend**:

  - Initialize a new Ember.js application within the project.
  - Configure the build and development environment to work alongside the existing Express.js backend.

- **Reimplement Current Features in Ember.js**:

  - Recreate album list view and photo grid view using Ember.js components.
  - Ensure existing functionality (album navigation, photo display, sorting) works seamlessly.

- **Implement Interactive Photo Selection**:

  - Develop a photo selection mechanism that allows users to select multiple photos via mouse dragging.
  - Use Ember.js services to manage the selection state and ensure persistence across different sorting views.

- **Add Actions for Selected Photos**:

  - Implement UI elements (buttons, menus) to perform actions on selected photos.
  - Set up API endpoints in Express.js to handle actions like adding to albums and exporting images.

- **Organize Albums in Photos Library**:

  - Use `osxphotos` to create new albums under a specific folder in the Photos library.
  - Ensure that the application can interact with the Photos library to perform these actions.

### 2. Medium Priority

- **Image Loading Optimization**:

  - Implement lazy loading of images to enhance performance with large photo collections.
  - Use Ember.js add-ons or native capabilities to achieve efficient image rendering.

- **UI/UX Enhancements**:

  - Improve the overall look and feel of the application.
  - Ensure the interface is intuitive and user-friendly for complex interactions.

- **Error Handling and Notifications**:

  - Provide user feedback for actions, especially for long-running processes.
  - Implement notifications or status indicators within the Ember.js app.

### 3. Low Priority

- **User Preferences and Settings**:

  - Allow users to save preferences like default export directories or album names.
  - Implement user authentication if necessary.

- **Advanced Filtering Options**:

  - Introduce additional filters (e.g., location, camera model, EXIF data).
  - Allow sorting by other subjective evaluation attributes.

- **Testing and Quality Assurance**:

  - Write unit and integration tests for both frontend and backend components.
  - Ensure robust error handling and data validation.

## Next Steps

1. **Initialize Ember.js Application**:

   - Install Ember CLI and set up the Ember.js app within the project directory.
   - Configure the development environment to run both the Ember.js frontend and Express.js backend concurrently.

2. **Set Up API Endpoints**:

   - Define RESTful API endpoints in Express.js for data retrieval and actions.
   - Ensure CORS is configured correctly for communication between frontend and backend.

3. **Reimplement Existing Features**:

   - Create Ember.js routes and components for album list and photo grid views.
   - Implement sorting functionality using Ember's computed properties and actions.

4. **Develop Photo Selection Mechanism**:

   - Use Ember.js components and services to enable photo selection via mouse dragging.
   - Ensure selection state persists across sorting changes.

5. **Implement Actions on Selected Photos**:

   - Add UI elements for actions like "Add to Album" and "Export Selected Photos."
   - Implement backend logic to handle these actions using `osxphotos`.

6. **Optimize Image Loading**:

   - Implement lazy loading for images to improve performance.
   - Test with large albums to ensure smooth user experience.

7. **Plan for Future Enhancements**:

   - Outline additional features and improvements based on user feedback and testing.
   - Prioritize tasks and update the development plan accordingly.

## Collaboration Notes

- **Code Provisioning**:

  - Provide full files for any code changes to facilitate copy-paste replacement.
  - Organize the project into smaller files if necessary to improve manageability.

- **Documentation**:

  - Keep all project files updated, including `README.md`, `ISSUES.md`, and `project-guidelines.md`.
  - Document architectural decisions and code changes thoroughly.

- **Issue Tracking**:

  - Utilize `ISSUES.md` for logging problems and tracking resolutions.
  - Include open-ended questions and uncertainties to encourage collaborative problem-solving.
