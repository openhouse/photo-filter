# Photo Filter Application Monorepo

## Overview

This monorepo contains both the Ember.js frontend and the Express.js backend of the Photo Filter Application. It enables browsing, filtering, and exporting photos from your macOS Photos library.

## Project Structure

- **backend/**: Express.js backend application.
- **frontend/**: Ember.js frontend application.
- **DEVELOPMENT_PLAN.md**: Roadmap and implementation details.
- **ISSUES.md**: Issues, debugging steps, and resolutions.
- **project-guidelines.md**: Collaboration and coding standards.

## Features

- **Album Navigation**: Browse albums via a left-side navigation column.
- **Photo Display**: View photos in selected albums with various sort options.
- **Faceted Person-Based Filtering**:  
  Under the currently active album, see a list of all recognized people.
  - **Single Person Filter**: Click one person’s name to display only photos with that individual.
  - **Multiple People Filter**: Select additional names to narrow photos down to those containing _all_ the chosen individuals, enabling powerful faceted search.
- **Sorting**: Sort photos by various attributes (e.g., aesthetic scores).
- **Photo Selection**: Select multiple photos; selections persist across sorting changes.
- **Export Functionality**: Export selected photos to a directory.

## Data Synchronization and Freshness

- The backend checks for changes in the Photos library.
- Cache invalidation ensures up-to-date album and photo data.

## Performance and Optimization

- JSON:API compliance for seamless Ember Data integration.
- Plans to implement lazy loading and indexing for improved performance.

## UI/UX

- Nested routes (`{{outlet}}`) for clarity.
- Future enhancements include more intuitive multi-person selection interfaces and better export feedback.

## Installation and Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/yourusername/photo-filter.git
   cd photo-filter

   2.	Backend Setup:
   ```

cd backend
npm install
npm run setup
npm run dev

    3.	Frontend Setup:

Open a new terminal window:

cd frontend/photo-filter-frontend
npm install
npm run start

    4.	Access the Application:

Visit http://localhost:4200.

Contributing
• Use clear and descriptive commit messages.
• Track issues in ISSUES.md.
• Follow guidelines in project-guidelines.md.

Testing
• Backend: Use Jest for tests (npm run test in backend/).
• Frontend: Use Ember CLI testing (npm run test in frontend/).

License

This project is licensed under the MIT License.
