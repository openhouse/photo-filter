# Photo Filter Application

## Overview

The **Photo Filter Application** is a locally running Node.js web application designed to help photographers interactively filter and export their top photos based on Apple's aesthetic scores and other metadata from the macOS Photos library.

## Features

- **Album Navigation and Selection**: Navigate through and select specific albums from your Photos library within the web app.
- **Interactive Sorting and Filtering**: Sort and filter photos using attributes like aesthetic scores, dates, keywords, and people.
- **Symlinked Photo Export**: Export filtered photos as symlinks to avoid taking up extra disk space.
- **Export Directory Structure**: Exports are organized under `exports/yyyy-mm-dd/named_export/` for easy management.
- **Photoshop Integration**: The export directories are compatible with Adobe Photoshop's Photomerge automation.
- **Web Interface**: View and interact with filtered photos in a user-friendly web interface.
- **Privacy-Focused**: Personal data and photos are kept locally and are not included in the git repository.

## Technologies Used

- **Node.js**: Server-side JavaScript runtime.
- **Express.js**: Web framework for handling routes and middleware.
- **Express Handlebars**: Template engine for rendering dynamic content.
- **SCSS/Sass**: CSS preprocessor for styling.
- **osxphotos**: External tool for exporting photos and metadata from the macOS Photos library.

## Setup Instructions

### **Prerequisites**

- **macOS 15.0.1** or later.
- **Node.js** (version specified in `.nvmrc`)
- **Yarn** package manager
- **Python 3** installed on macOS
- **osxphotos** installed via the setup script.

### **Installation**

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/photo-filter.git
   cd photo-filter
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Set up the project**:

   ```bash
   yarn setup
   ```

   This will create a Python virtual environment and install `osxphotos` into it.

4. **Set up Node.js version**:

   ```bash
   nvm use
   ```

### **Running the Application**

- **Development Mode**:

  ```bash
  yarn dev
  ```

  This will start the server with nodemon and watch for SCSS changes.

- **Production Mode**:

  ```bash
  yarn build-sass
  yarn start
  ```

### **Accessing the Application**

- Open your browser and navigate to `http://localhost:3000` to view the application.

**Note**: The application uses the `osxphotos` executable from the virtual environment. You do not need to activate the virtual environment manually.

## Usage

- **Album Navigation**: Browse and select albums from your Photos library within the app.
- **Sorting and Filtering**: Apply various filters and sorting options to refine your photo selection.
- **Exporting Photos**:

  - **Create Named Exports**: After filtering, create a named export that symlinks the selected photos.
  - **Export Directory Structure**: Exports are saved under `exports/yyyy-mm-dd/named_export/`.
  - **Photoshop Integration**: Point Photoshop's Photomerge automation to the export directory for seamless integration.

**Note**: The first time you run the application, it may take some time to export data from the Photos library.

## Development Roadmap

### **Current Status**

- **Data Extraction**: Successfully extracts photo metadata and images using `osxphotos`.
- **Interactive Album Navigation**: Pending implementation.
- **Enhanced Sorting and Filtering**: Pending implementation.
- **Symlinked Photo Export**: Pending implementation.
- **Web Interface**: Basic version displaying photos and scores.
- **Styling**: Initial styling applied using SCSS.

### **Pending Tasks**

Refer to the detailed tasks and priorities in `DEVELOPMENT_PLAN.md`.

## Contributing

Please read `project-guidelines.md` for details on our code of conduct and the process for submitting pull requests.

## Privacy Considerations

- Personal data and photos are stored locally on your machine.
- The application excludes personal data from the git repository.
- Temporary caches and exported data are not shared and remain on your local system.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Thanks to the developers of `osxphotos` for providing a powerful tool to interact with the macOS Photos library.
- Inspired by Simon Willison's work on querying the Apple Photos SQLite database.
