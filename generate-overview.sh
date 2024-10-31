#!/bin/bash

# ./generate-overview.sh

# Generate project overview
OUTPUT_FILE="project-overview.txt"

echo "# Project Overview: Photo Filter" > $OUTPUT_FILE

echo -e "\nGenerated on: $(date)\n" >> $OUTPUT_FILE

echo "This project is a monorepo containing both the Ember.js frontend and the Express.js backend applications." >> $OUTPUT_FILE
echo "---" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "## Project Structure" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Exclude specified directories
EXCLUDE_DIRS='node_modules|.git|venv|dist|build|cache|logs'

# Generate the directory tree
echo "\`\`\`" >> $OUTPUT_FILE
tree -a -I "$EXCLUDE_DIRS" >> $OUTPUT_FILE
echo "\`\`\`" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "---" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Function to list files with specific extensions
list_files() {
  local DIR=$1
  local OUTPUT=$2

  FILES=$(find $DIR -type f \( \
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
    # For large JSON files, include only the first 20 lines
    if [[ "$FILE" == *.json && $(wc -l < "$FILE") -gt 100 ]]; then
      echo "### **$FILE**" >> $OUTPUT
      echo "\`\`\`json" >> $OUTPUT
      head -n 20 "$FILE" >> $OUTPUT
      echo "..." >> $OUTPUT
      echo "\`\`\`" >> $OUTPUT
      echo "" >> $OUTPUT
    else
      echo "### **$FILE**" >> $OUTPUT
      echo "\`\`\`" >> $OUTPUT
      cat "$FILE" >> $OUTPUT
      echo "\`\`\`" >> $OUTPUT
      echo "" >> $OUTPUT
    fi
  done
}

echo "## Backend Files" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
list_files "./backend" $OUTPUT_FILE

echo "## Frontend Files" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
list_files "./frontend/photo-filter-frontend" $OUTPUT_FILE
