#!/usr/bin/env bash
#
# generate-overview.sh
#
# Generates project-overview.txt with:
#   - System / environment details (arch, OS, Node version)
#   - Timestamp
#   - Current Git branch
#   - Project structure (via tree or fallback to ls -R)
#   - File listings/contents for specific file types, partial JSON for large JSON files
#
# Usage:
#   chmod +x generate-overview.sh
#   ./generate-overview.sh

OUTPUT_FILE="project-overview.txt"

# 1) Start fresh
echo "# Project Overview: Photo Filter" > "$OUTPUT_FILE"

# 2) Environment details
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

# 3) Current Git branch (shows 'HEAD' if detached)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")
echo "Branch: $CURRENT_BRANCH" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Basic project description
echo "This project is a monorepo containing both the Ember.js frontend and the Express.js backend applications." >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 4) Project structure
echo "## Project Structure" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Exclude these directories from the tree listing
EXCLUDE_DIRS='node_modules|.git|venv|dist|build|cache|logs|images|images-source'

echo "\`\`\`" >> "$OUTPUT_FILE"
if command -v tree >/dev/null 2>&1; then
  # Use tree if available
  tree -a -I "$EXCLUDE_DIRS" >> "$OUTPUT_FILE"
else
  # Fallback to ls -R if tree is not installed
  echo "[No 'tree' command found; using 'ls -R' fallback.]" >> "$OUTPUT_FILE"
  ls -R . >> "$OUTPUT_FILE"
fi
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 5) Function to list & embed file contents
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
    -not -path "*/logs/*")

  for FILE in $FILES; do
    # If JSON file is very large, only show first 20 lines
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

# 6) Root-level markdown files
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

# 7) Backend files
echo "## Backend Files" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
list_files "./backend" "$OUTPUT_FILE"

# 8) Frontend files
echo "## Frontend Files" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
list_files "./frontend/photo-filter-frontend" "$OUTPUT_FILE"

echo "Overview generation complete! See '$OUTPUT_FILE'."
