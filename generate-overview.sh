#!/usr/bin/env bash
#
# generate-overview.sh
#
# Generates project-overview.txt with:
#   - System / environment details (arch, OS, Node version)
#   - Timestamp, current Git branch
#   - Project structure (via tree or fallback to ls -R)
#   - Root-level markdown files embedded
#   - Backend and frontend files embedded (partial JSON for large JSON)
#   - Optional fetch of /api/time-index
#   - Summaries (photo count, earliest/latest date) for each photos.json in backend/data/albums
#
# Usage:
#   chmod +x generate-overview.sh
#   ./generate-overview.sh

OUTPUT_FILE="project-overview.txt"

#####################################
# 1) Start fresh
#####################################
echo "# Project Overview: Photo Filter" > "$OUTPUT_FILE"

#####################################
# 2) Environment details
#####################################
{
  echo ""
  echo "Generated on: $(date)"
  echo "System Architecture: $(uname -m || echo 'Unknown Architecture')"

  # Check if we’re on Darwin (macOS)
  if [[ "$(uname -s)" == "Darwin" ]]; then
    # Attempt to get product version with sw_vers
    MACOS_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "Unknown")
    echo "Operating System: macOS $MACOS_VERSION"
  else
    # If not Darwin, optionally show something else
    echo "Operating System: $(uname -sr || echo 'Unknown OS')"
  fi

  echo "Node Version: $(node --version || echo 'Node Not Found')"
} >> "$OUTPUT_FILE"

#####################################
# 3) Current Git branch
#####################################
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")
echo "Branch: $CURRENT_BRANCH" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Basic project description
{
  echo "This project is a monorepo containing both the Ember.js frontend and the Express.js backend applications."
  echo "---"
  echo ""
} >> "$OUTPUT_FILE"

#####################################
# 4) Project structure
#####################################
echo "## Project Structure" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"

EXCLUDE_DIRS='node_modules|.git|venv|dist|build|cache|logs|images|images-source'

if command -v tree >/dev/null 2>&1; then
  # Use tree if available
  tree -a -I "$EXCLUDE_DIRS" >> "$OUTPUT_FILE"
else
  # Fallback to ls -R if tree is not installed
  echo "[No 'tree' command found; using 'ls -R' fallback.]" >> "$OUTPUT_FILE"
  ls -R . >> "$OUTPUT_FILE"
fi

{
  echo "\`\`\`"
  echo ""
  echo "---"
  echo ""
} >> "$OUTPUT_FILE"

#####################################
# 5) Function to list & embed file contents
#    (partial JSON for large JSON)
#####################################
list_files() {
  local DIR=$1
  local OUTPUT=$2

  FILES=$(find "$DIR" -type f \( \
    -name "*.js" -o \
    -name "*.ts" -o \
    -name "*.scss" -o \
    -name "*.hbs" -o \
    -name "*.json" -o \
    -name "*.md" -o \
    -name "*.sh" -o \
    -name ".*rc" -o \
    -name ".gitignore" \
  \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/venv/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/cache/*" \
    -not -path "*/logs/*" \
    -not -path "*/images/*" \
    -not -path "*/images-source/*")

  for FILE in $FILES; do
    # If JSON file is very large, show first 20 lines
    if [[ "$FILE" == *.json && $(wc -l < "$FILE") -gt 100 ]]; then
      echo "### **$FILE**" >> "$OUTPUT"
      echo "\`\`\`json" >> "$OUTPUT"
      head -n 20 "$FILE" >> "$OUTPUT"
      echo "..." >> "$OUTPUT"
      echo "\`\`\`" >> "$OUTPUT"
      echo "" >> "$OUTPUT"
    else
      echo "### **$FILE**" >> "$OUTPUT"
      echo "\`\`\`" >> "$OUTPUT"
      cat "$FILE" >> "$OUTPUT"
      echo "\`\`\`" >> "$OUTPUT"
      echo "" >> "$OUTPUT"
    fi
  done
}

#####################################
# 6) Root-level markdown files
#####################################
echo "## Root-Level Files" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

for FILE in *.md; do
  if [[ -f "$FILE" ]]; then
    echo "### **./$FILE**" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    cat "$FILE" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  fi
done

#####################################
# 7) Backend Files
#####################################
echo "## Backend Files" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
list_files "./backend" "$OUTPUT_FILE"

#####################################
# 8) Frontend Files
#####################################
echo "## Frontend Files" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
list_files "./frontend/photo-filter-frontend" "$OUTPUT_FILE"

#####################################
# 9) Attempt to fetch /api/time-index
#####################################
{
  echo "## Time Index from /api/time-index"
  echo ""
} >> "$OUTPUT_FILE"

if command -v curl >/dev/null 2>&1; then
  echo "Fetching http://localhost:3000/api/time-index ..." >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"

  # Attempt silent fetch
  # If it fails, note that
  if ! curl -s http://localhost:3000/api/time-index >> "$OUTPUT_FILE"; then
    echo "Could not fetch /api/time-index. Is the server running?" >> "$OUTPUT_FILE"
  fi
else
  echo "curl not found, cannot fetch /api/time-index" >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

#####################################
# 10) Summaries of each photos.json
#     in backend/data/albums
#####################################
ALBUMS_DIR="./backend/data/albums"
{
  echo "## Photos.json Summaries in $ALBUMS_DIR"
  echo ""
} >> "$OUTPUT_FILE"

if [ -d "$ALBUMS_DIR" ]; then
  find "$ALBUMS_DIR" -name "photos.json" | while read -r PHOTOS_JSON; do
    ALBUM_PATH="$(dirname "$PHOTOS_JSON")"
    ALBUM_UUID="$(basename "$ALBUM_PATH")"
    PHOTO_COUNT="??"

    # Attempt to parse length with jq
    if command -v jq >/dev/null 2>&1; then
      PHOTO_COUNT=$(jq '. | length' "$PHOTOS_JSON" 2>/dev/null || echo "??")
    fi

    # Attempt earliest & latest date
    EARLIEST="unknown"
    LATEST="unknown"
    if command -v jq >/dev/null 2>&1; then
      EARLIEST=$(jq -r 'map(.date) | sort | first // "unknown"' "$PHOTOS_JSON" 2>/dev/null || echo "unknown")
      LATEST=$(jq -r 'map(.date) | sort | last // "unknown"' "$PHOTOS_JSON" 2>/dev/null || echo "unknown")
    fi

    echo "### Album UUID: $ALBUM_UUID" >> "$OUTPUT_FILE"
    echo "Location: $PHOTOS_JSON" >> "$OUTPUT_FILE"
    echo "Photo Count: $PHOTO_COUNT" >> "$OUTPUT_FILE"
    echo "Earliest Date: $EARLIEST" >> "$OUTPUT_FILE"
    echo "Latest Date: $LATEST" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  done
else
  echo "No directory found at $ALBUMS_DIR" >> "$OUTPUT_FILE"
fi

#####################################
# 11) Done
#####################################
echo "Overview generation complete! See '$OUTPUT_FILE'."
