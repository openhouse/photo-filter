# Issues and Resolutions

This file serves as a log of open issues, debugging steps taken, and resolutions. It's intended to facilitate collaborative problem-solving and prevent redundant efforts.

---

## Issue 8: Implementing Interactive Photo Selection and Persistence

**Opened By:** [Your Name] on Oct 27, 2024

**Status:** **Open**

**Description:**

We need to implement the ability for users to select multiple photos by clicking and dragging the mouse over them. Selections should persist as users switch between different sorting attributes. This functionality is essential for allowing users to collect photos as they explore their albums.

**Challenges:**

- **Mouse Drag Selection**: Implementing a user-friendly and intuitive way to select multiple photos with mouse dragging.
- **Selection Persistence**: Maintaining the selection state across different views and sorting options.
- **Performance**: Ensuring that the selection mechanism is performant, especially with large photo collections.

**Potential Solutions:**

- **Use Ember.js Services**:

  - Create a service to store the selection state, which can be accessed across different components and routes.

- **Photo Item Component**:

  - Develop a `PhotoItem` component that can detect mouse events and update the selection state accordingly.

- **Selection Library**:

  - Consider using or integrating with a library that handles drag selection (e.g., `ember-cli-drag-select`).

**Action Items:**

- Research existing Ember.js add-ons or libraries that facilitate drag selection.
- Implement the `SelectionService` to manage the selection state.
- Update the `PhotoGrid` and `PhotoItem` components to handle mouse events for selection.
- Ensure that the selection state is preserved when sorting attributes change.

**Questions to Consider:**

- How will the selection state be affected if the user navigates away from the album view?
- Do we need to implement a way to save and load selections across sessions?
- How can we optimize performance to handle thousands of photos?

---

## Issue 9: Adding Actions for Selected Photos

**Opened By:** [Your Name] on Oct 27, 2024

**Status:** **Open**

**Description:**

After implementing the selection mechanism, we need to allow users to perform actions on the selected photos, such as adding them to an album in the Photos library or exporting them to a directory.

**Challenges:**

- **Backend Integration**: Setting up API endpoints to handle actions on the backend.
- **Interaction with Photos Library**: Using `osxphotos` to add photos to albums or export them.
- **User Feedback**: Providing real-time feedback to the user about the status of their actions.

**Potential Solutions:**

- **API Endpoints**:

  - Create POST endpoints in Express.js to handle actions on selected photos.

- **Asynchronous Processing**:

  - Implement background jobs or asynchronous processing for long-running tasks like exporting photos.

- **Notifications**:

  - Use Ember.js notifications or toasts to inform users about the progress and completion of actions.

**Action Items:**

- Define the API endpoints and their payload structures.
- Implement the backend logic to interact with `osxphotos`.
- Update the Ember.js frontend to send requests to the API when actions are triggered.
- Provide user feedback through UI elements.

**Questions to Consider:**

- How will we handle errors or failures during these actions?
- Do we need to implement a progress indicator for actions that take a long time?
- Are there permissions or security considerations when interacting with the Photos library?

---

## Issue 10: Transitioning to Ember.js Frontend

**Opened By:** [Your Name] on Oct 27, 2024

**Status:** **Open**

**Description:**

We need to plan and execute the transition from the current Handlebars templates to an Ember.js frontend. This includes reimplementing existing features and ensuring that the application remains functional during the transition.

**Challenges:**

- **Development Environment**: Setting up the project to run both the backend and frontend seamlessly.
- **Data Communication**: Ensuring that data is correctly passed between the frontend and backend.
- **Feature Parity**: Reimplementing all existing features without losing functionality.

**Potential Solutions:**

- **Incremental Transition**:

  - Gradually replace parts of the frontend, starting with less critical components.

- **API Development**:

  - Define clear API contracts to facilitate communication between the frontend and backend.

- **Testing**:

  - Write tests to ensure that features work as expected after reimplementation.

**Action Items:**

- Set up the Ember.js application and configure it to work with the Express.js backend.
- Recreate the album list and photo grid views in Ember.js.
- Implement data fetching using Ember Data and ensure API endpoints return data in the expected format.
- Test all existing features thoroughly after reimplementation.

**Questions to Consider:**

- How will we handle authentication and session management, if needed?
- What are the risks of downtime during the transition, and how can we mitigate them?
- Are there any dependencies or plugins we need to consider for Ember.js?

---

# End of Issues Log
