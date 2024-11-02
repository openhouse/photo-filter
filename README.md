# Photo Filter Application Monorepo

## Overview

This monorepo contains both the Ember.js frontend and the Express.js backend of the Photo Filter Application.

## Project Structure

- `backend/`: Contains the Express.js backend application.
- `frontend/`: Contains the Ember.js frontend application.
- `generate-overview.sh`: Script to generate the project overview.
- `DEVELOPMENT_PLAN.md`: Development plan and objectives.
- `ISSUES.md`: Log of issues and resolutions.
- `project-guidelines.md`: Guidelines for collaboration and development.

## Installation and Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/yourusername/photo-filter.git
   cd photo-filter
   ```

## Data Synchronization and Cache Invalidation

This application uses a caching mechanism to store data extracted from the Apple Photos library. To ensure that users see the most up-to-date information, we have implemented cache invalidation based on timestamps.

### How It Works

- **Albums and Photos Data**:

  - The backend checks the last modified time of the Photos library and compares it with the last modified time of the cached data files (`albums.json`, `photos.json`).
  - If the Photos library has been updated since the cache was last generated, the backend regenerates the cache by re-running the data extraction scripts.
  - This process ensures that any new albums or photos added to the Photos library are reflected in the application.

### Benefits

- **Data Freshness**: Users always see the latest albums and photos without manual intervention.
- **Performance Optimization**: The application avoids unnecessary data regeneration, improving performance.
