# Development Plan

## Update: Implementing Nested Routes and UI Enhancements

**Date:** November 12, 2024

### Decision

- **Implement Nested Routes with `{{outlet}}` in `albums.hbs`**: To properly render child routes within the parent `albums` route.
- **Create Left Navigation Column**: Mimic the UI of the Apple Photos app by adding a left navigation column for album selection.
- **Display Full Photo Library on Index Route**: Show all photos when no specific album is selected.
- **Implement Expanded Sorting and Selection Features**: Allow sorting by various attributes and enable photo selection that persists across sorting changes.

### Rationale

- **User Experience**: Enhances navigation and usability by providing a familiar interface.
- **Functionality**: Supports the requirement to sort photos by multiple attributes and manage selections effectively.
- **Scalability**: Sets a foundation for future features like exporting and advanced photo management.

### Implementation Steps

1. **Add `{{outlet}}` to `albums.hbs`**:

   - Update `app/templates/albums.hbs` to include `{{outlet}}` for rendering child routes.

2. **Create Left Navigation Layout**:

   - Structure `albums.hbs` to have a left navigation column (`albums-list`) and a content area (`album-content`).

3. **Display Full Photo Library When No Album is Selected**:

   - Create `app/routes/albums/index.js` and `app/templates/albums/index.hbs` to fetch and display all photos.

4. **Implement Expanded Sorting Functionality**:

   - Update `app/controllers/albums/album.js` to handle additional sorting attributes and orders.

5. **Implement Photo Selection Mechanism**:

   - Create a selection service (`app/services/selection.js`) to manage selected photos.
   - Update `albums/album.hbs` and `albums/album.js` to handle photo selection.

6. **Implement Export Functionality**:

   - Add an endpoint in the backend (`backend/routes/api/photos.js`) to handle exporting selected photos.
   - Update the frontend to send selected photo IDs to the backend for export.

7. **Styling and Responsiveness**:

   - Add CSS styles to `app/styles/app.css` to make the application visually appealing and responsive.

8. **Testing**:

   - Write tests for new features, especially the selection and export functionalities.

9. **Documentation**:

   - Update `README.md`, `DEVELOPMENT_PLAN.md`, `ISSUES.md`, and `project-guidelines.md` to reflect changes.

### Potential Challenges

- **Persistent Selection State**: Ensuring the selection persists across sorting and navigation changes.
- **Performance**: Managing performance with large photo libraries, especially during selection and export.
- **Backend Integration**: Properly handling the export functionality without affecting the Photos library integrity.

---

## Previous Updates

### Update: Implementing Cache Invalidation Based on Timestamps

- **Date:** November 1, 2024
- **Decision:** Implement cache invalidation to ensure data freshness.
- **Implementation:** Created utility functions to check last modified times and regenerate cached data as needed.

### Update: Integration of JSON:API Serializer

- **Date:** October 30, 2024
- **Decision:** Use `jsonapi-serializer` package to format API responses according to the JSON:API specification.
- **Implementation:** Refactored backend controllers and updated dependencies.

---

## Project Goal

Develop a web application that interfaces with the user's macOS Photos library to enable interactive exploration, selection, and exporting of photos based on Apple's aesthetic scores and other metadata. The application aims to provide an engaging user experience by allowing users to select photos through intuitive interactions and perform actions like exporting selections.

## Current State

- **Frontend**: Ember.js application with nested routes and a left navigation layout.
- **Backend**: Express.js server with API endpoints serving data in JSON:API format.
- **Data Handling**: Uses `osxphotos` to extract data from the Photos library.
- **Photo Selection**: Implemented using an Ember service to manage selection state.
- **Export Functionality**: Backend API endpoint to handle exporting selected photos.
- **Styling**: Basic CSS styling for responsive design.
- **Documentation**: Project files (`README.md`, `ISSUES.md`, `DEVELOPMENT_PLAN.md`, `project-guidelines.md`) are updated.

## Next Steps

1. **Enhance Photo Selection Features**:

   - Implement the ability to expand the selection to include photos taken immediately before and after the selected photos.
   - Ensure selection persistence across different sorting and navigation.

2. **Complete Export Functionality**:

   - Implement the backend logic to actually export the selected photos to a designated directory.
   - Provide user feedback on the export process.

3. **UI/UX Improvements**:

   - Refine the user interface for better intuitiveness.
   - Add visual indicators for selected photos and selection expansion.

4. **Performance Optimization**:

   - Implement lazy loading for images.
   - Optimize data fetching and rendering for large photo libraries.

5. **Testing and Quality Assurance**:

   - Write comprehensive tests for new features.
   - Perform user testing to gather feedback.

6. **Documentation and Cleanup**:

   - Update documentation to reflect new features and changes.
   - Refactor code for maintainability.

---

**Note:** All changes should be committed to the repository with clear and descriptive commit messages to maintain project history and facilitate collaboration.
