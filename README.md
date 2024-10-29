# Photo Filter Application: Interactive Photo Exploration and Management

## Overview

The **Photo Filter Application** is a web application that allows users to interactively explore, select, and manage photos from their macOS Photos library. By leveraging Apple's aesthetic scores and other metadata, users can sort and filter their photos, make selections across different sorting attributes, and perform actions like adding to albums or exporting selected images.

## Features

- **Interactive Album Navigation**:

  - Browse and select albums from your Photos library within the application.
  - View photos within albums and sort them based on various attributes.

- **Interactive Photo Selection**:

  - Select multiple photos by clicking and dragging the mouse over them.
  - Selections persist across different sorting attributes, allowing you to collect photos as you explore.

- **Actions on Selected Photos**:

  - Add selected photos to a new or existing album in your Photos library.
  - Export selected photos to a directory on your computer.
  - New albums are organized under a designated folder (e.g., "photo-filter") in your Photos library.

- **Enhanced User Experience with Ember.js**:

  - Responsive and interactive frontend built with Ember.js.
  - Lazy loading of images for improved performance with large photo collections.

- **Sorting and Filtering**:

  - Sort photos based on aesthetic scores, dates, keywords, and more.
  - Apply filters to refine your photo selection.

## Technologies Used

- **Ember.js**: Frontend framework for building a rich, interactive user interface.
- **Express.js**: Backend server handling API requests and communication with the Photos library.
- **Node.js**: Runtime environment for executing JavaScript on the server.
- **osxphotos**: Python library for interfacing with the macOS Photos library.
- **SCSS/Sass**: Styling the application for a cohesive and responsive design.

## Installation and Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/yourusername/photo-filter.git
   cd photo-filter
   ```

2. **Install Backend Dependencies**:

   ```bash
   cd backend
   yarn install
   ```

3. **Install Frontend Dependencies**:

   ```bash
   cd ../frontend
   yarn install
   ```

4. **Set Up the Project**:

   - Run the setup script to install `osxphotos` and configure the environment.

     ```bash
     cd ../
     yarn setup
     ```

5. **Set Node.js Version**:

   ```bash
   nvm use
   ```

## Running the Application

- **Development Mode**:

  - Start the backend server:

    ```bash
    cd backend
    yarn dev
    ```

  - Start the Ember.js frontend:

    ```bash
    cd ../frontend
    ember serve
    ```

- **Production Mode**:

  - Build the frontend:

    ```bash
    cd frontend
    ember build --environment=production
    ```

  - Start the backend server (serving the built frontend):

    ```bash
    cd ../backend
    yarn start
    ```

Access the application at `http://localhost:4200` during development.

## Usage

1. **Browse Albums**:

   - Navigate through your albums and select one to view its photos.

2. **Select Photos**:

   - Click and drag over photos to select multiple items.
   - Selections persist as you sort and filter the photos.

3. **Sort and Filter**:

   - Use the sorting options to order photos by different attributes.
   - Apply filters to narrow down the photo list.

4. **Perform Actions**:

   - Add selected photos to a new or existing album in your Photos library.
   - Export selected photos to a directory on your computer.

## Contributing

We welcome contributions that enhance the application's functionality and user experience. Please read `project-guidelines.md` for details on our collaborative approach.

## License

This project is licensed under the MIT License.

## Acknowledgments

- **osxphotos**: For providing a powerful interface to the macOS Photos library.
- **Ember.js Community**: For creating a robust framework that empowers our frontend development.
