# Photo Filter Application Monorepo

## Overview

This monorepo contains both the Ember.js frontend and the Express.js backend of the Photo Filter Application. It enables browsing, filtering, and exporting photos from your macOS Photos library.

## Project Structure

- **backend/**: Express.js backend application.
- **frontend/**: Ember.js frontend application.
- **DEVELOPMENT_PLAN.md**: Roadmap and implementation details.
- **ISSUES.md**: Issues, debugging steps, and resolutions.
- **project-guidelines.md**: Collaboration and coding standards.
- **docs/API_ENDPOINTS.md**: Reference for all available API routes.

## Canonical filename template

**Invariant:** All exported/derived photo filenames MUST follow this template:

```
{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}{ext}
```

- `created.utc` – UTC timestamp (not local time)
- `%Y%m%dT%H%M%S%fZ` – ISO-like, with microseconds and trailing `Z`
- `{original_name}` – camera/original base name without extension
- `{ext}` – the original file extension, preserved (HEIC/JPG/etc.)

**Why:** Lexicographic order == chronological order across devices/cameras, which our film/animation tooling depends on.

**Overriding (advanced):**
- Set `FILENAME_TEMPLATE` in the environment (see `.env.example`).
- (Optional) set `JPEG_EXT=jpg|jpeg|JPG|JPEG` to normalize JPEG extension casing.

**Collision resolution (deterministic):**
If multiple assets render to the same filename key, we pick the “winner” via:
1) larger pixel area (width × height)  
2) larger original file size  
3) prefer non-RAW sidecar  
4) UUID lexical tiebreak

All colliding UUIDs are recorded in `backend/data/library/filename-collisions.json`.

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
  - **Top‑N Exports by Score**: Automatically copy the top N photos for several aesthetic metrics and the currently selected people via `POST /api/albums/:albumUUID/export-top-n`.
    Each person folder contains an `_all` directory with all unique photos merged from the individual score folders, and the album itself keeps an `_all` directory aggregating every unique photo across all people.

## Data Synchronization and Freshness

- The backend checks for changes in the Photos library.
- Cache invalidation ensures up-to-date album and photo data.

## Performance and Optimization

- JSON:API compliance for seamless Ember Data integration.
- Plans to implement lazy loading and indexing for improved performance.

## API Documentation

See [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md) for a list of all REST
endpoints, including the filename lookup API introduced in this release.

## UI/UX

- Nested routes (`{{outlet}}`) for clarity.
- Future enhancements include more intuitive multi-person selection interfaces and better export feedback.

## Post-Photo-Filter Export Workflow: Preparing Photos for Video Editing

Once you have exported a directory of photos from the Photo Filter application, you may want to prepare them for video editing in Final Cut Pro X (FCPX) or another professional non-linear editor. The following steps outline how to normalize image orientation, generate a consistent file list, determine dimensions, and create a ProRes video file that preserves aspect ratios for all images.

**Prerequisites:**

- [ImageMagick](https://imagemagick.org/index.php)
- [FFmpeg](https://ffmpeg.org/) and its associated tools (e.g., \`ffprobe\`)
- A directory of \`.jpg\` images exported from the Photo Filter app

### 1. Ensure All Images Have the Correct Orientation

Use ImageMagick to apply rotation metadata directly to the pixel data. This ensures that downstream tools see the images correctly oriented:

\`\`\`bash
brew install imagemagick
mogrify -auto-orient \*.jpg
\`\`\`

### 2. Generate a File List for ffmpeg

First, list all \`.jpg\` images in the current directory:

\`\`\`bash
ls -1 \*.jpg > file_list.txt
\`\`\`

Then convert that listing into a format ffmpeg can parse:

\`\`\`bash
awk '{print "file \x27" $0 "\x27"}' file_list.txt > formatted_list.txt
\`\`\`

### 3. Determine the Dimensions of the First Image

Check the width and height of one of your images using ffprobe. Replace \`DSCF8482.jpg\` with an actual image filename from your directory:

\`\`\`bash
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 DSCF8482.jpg
\`\`\`

Suppose this returns \`6240,4160\`. These will be your reference dimensions.

### 4. Convert Images to a Video with Preserved Aspect Ratios

Use ffmpeg to generate a ProRes \`.mov\` file. Scale and pad each image to fit the chosen dimensions (e.g., \`6240x4160\`) without distortion. Replace \`6240\` and \`4160\` with the values obtained above:

\`\`\`bash
ffmpeg -f concat -safe 0 -i formatted_list.txt \
-vf "scale='min(iw\*4160/ih,6240)':4160,setsar=1,pad=6240:4160:(6240-iw)/2:(4160-ih)/2" \
-framerate 16 -c:v prores -pix_fmt yuv422p output_preserved_aspect.mov
\`\`\`

**What This Does:**

- **Scale:** Adjusts each image so that it fits within the 6240x4160 frame, preserving its aspect ratio.
- **Pad:** Centers the scaled image by adding black bars if needed.
- **ProRes Encoding:** Outputs a high-quality \`.mov\` file suitable for editing in Final Cut Pro or other professional NLEs.
- **Framerate:** Sets the video to 16 frames per second, which you can adjust as desired.

### Additional Tips

- **Adjust the Frame Rate:**  
  Change \`-framerate 16\` to your desired frame rate (e.g., \`-framerate 24\`).

- **Change the Output Codec:**  
  Prefer a different codec (e.g., H.264 for smaller file sizes)? Replace \`-c:v prores -pix_fmt yuv422p\` with \`-c:v libx264 -crf 18\`.

- **Further Refinements:**
  If you have specific creative requirements (e.g., adding transitions, stabilizing footage, or applying filters), you can incorporate those steps into your ffmpeg pipeline or perform them later in your video editing software.

- **Automate with `create-video.sh`:** Run `sh scripts/create-video.sh [-b COLOR] [-r FPS] [-s] [dir]` to generate a padded ProRes video. The `-b` option lets you choose a background color (use `transparent` for alpha padding). `-r` sets the input/output frame rate (defaults to 16 fps). Use `-s` to skip the mogrify orientation step when reusing pre-oriented files.

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

### 2025‑06‑16 — UTC filename upgrade

> **Breaking change:** After clearing `backend/data/albums`, all newly exported
> images will have a UTC timestamp prefix (see `docs/FILE‑NAMING.md`).
> Old caches can safely be deleted; no user‑visible paths changed.
