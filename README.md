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

2. **Set Up the Backend**:

   ```bash
   cd backend
   npm install
   npm run setup
   npm run dev
   ```

3. **Set Up the Frontend**:

   Open a new terminal window:

   ```bash
   cd frontend/photo-filter-frontend
   npm install
   npm run start
   ```

4. **Access the Application**:

   - Visit [http://localhost:4200](http://localhost:4200) to access the Ember.js frontend.

## Features

- **Album Navigation**: Browse albums using a left navigation column.
- **Photo Display**: View photos within selected albums.
- **Expanded Sorting**: Sort photos by various attributes, including aesthetic scores.
- **Photo Selection**: Select photos by clicking; selections persist across sorting changes.
- **Export Functionality**: Export selected photos to a directory.

## Data Synchronization and Cache Invalidation

- **Automatic Updates**: The backend checks for changes in the Photos library and updates cached data accordingly.
- **Data Freshness**: Ensures users see the most recent albums and photos.
- **Performance Optimization**: Avoids unnecessary data regeneration.

## Development Notes

- **Nested Routes**: Utilizes Ember.js nested routes with `{{outlet}}` to render child templates.
- **Ember Services**: Uses a selection service to manage photo selection state.
- **JSON:API Compliance**: Backend APIs conform to the JSON:API specification for seamless integration with Ember Data.
- **Styling**: Basic responsive design implemented with CSS.

## Contributing

- **Git Commit Messages**: Include clear and descriptive commit messages with every change.
- **Issue Tracking**: Use `ISSUES.md` to log problems and track resolutions.
- **Collaboration Guidelines**: Refer to `project-guidelines.md` for best practices.

## Testing

- **Backend Tests**: Use Jest for testing backend code.
- **Frontend Tests**: Use Ember CLI's testing tools.

## License

This project is licensed under the MIT License.
