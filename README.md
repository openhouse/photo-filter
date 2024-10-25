# Photo Filter Application: Weaving Stories Through Images

## Overview

The **Photo Filter Application** is more than just a tool—it's a narrative journey that empowers photographers to explore and curate their visual stories. By interfacing with the macOS Photos library, this application allows you to delve into the aesthetic qualities of your photographs, uncovering hidden patterns and meanings that reflect both personal and collective experiences.

## The Story Behind the Application

In a world inundated with images, finding the threads that connect our photos becomes a way of understanding ourselves and our culture. This application was born out of a desire to bridge the gap between technology and storytelling, enabling users to navigate their photo libraries not just as collections of files, but as evolving narratives that capture moments, emotions, and relationships.

## Features

- **Narrative Album Navigation**: Seamlessly browse through your albums, each representing a chapter in your visual story.
- **Semantic Sorting and Filtering**: Use meaningful criteria like aesthetic scores, dates, keywords, and people to find connections between images.
- **Symlinked Photo Export**: Create exports that are more than directories—they're curated exhibitions of your chosen narratives.
- **Cultural Context Integration**: The application acknowledges and integrates the cultural and semantic contexts of your photos, offering a richer experience.

## Technologies Used

- **Node.js**: Serving as the backbone of the application, facilitating communication between different components.
- **Express.js**: Managing routes and server logic in a way that mirrors the pathways users take through their photo narratives.
- **Express Handlebars**: Rendering dynamic content that adapts to the unfolding story of the user's interaction.
- **SCSS/Sass**: Styling the application to provide an immersive and aesthetically pleasing experience.
- **osxphotos**: Acting as a bridge between the application's narrative intent and the raw data of the Photos library.

## Installation and Setup

_The installation process is a journey that prepares your environment for the stories you're about to uncover._

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/yourusername/photo-filter.git
   cd photo-filter
   ```

2. **Install Dependencies**:

   ```bash
   yarn install
   ```

3. **Set Up the Project**:

   ```bash
   yarn setup
   ```

4. **Set Node.js Version**:

   ```bash
   nvm use
   ```

## Running the Application

- **Development Mode**:

  ```bash
  yarn dev
  ```

- **Production Mode**:

  ```bash
  yarn build-sass
  yarn start
  ```

Access the application at `http://localhost:3000` and begin your narrative exploration.

## Usage

_Every interaction with the application is a step deeper into your personal narrative._

- **Album Navigation**: Traverse your albums as if flipping through the pages of a storybook.
- **Semantic Filtering**: Apply filters that resonate with the themes and motifs you're interested in exploring.
- **Creating Exports**: Curate collections that represent significant chapters or themes in your visual journey.

## Contributing

We welcome contributions that enhance the narrative and cultural dimensions of the application. Please read `project-guidelines.md` for details on our collaborative approach.

## Acknowledgments

This project is inspired by the interplay between technology and culture, drawing upon perspectives that emphasize narrative, semantics, and the agency of all components involved.
