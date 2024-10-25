#!/bin/bash

# ./generate-overview.sh

# Generate project overview
OUTPUT_FILE="project-overview.txt"

echo "# Project Overview: Photo Filter" > $OUTPUT_FILE

echo -e "\nGenerated on: $(date)\n" >> $OUTPUT_FILE

echo "This project is a Node.js application that..." >> $OUTPUT_FILE
echo "---" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "## Project Structure" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Exclude specified directories
EXCLUDE_DIRS='node_modules|.git|venv|public/*images*|public/uploads|public/cache|public/*export*|dist|build|cache'

# Generate the directory tree
echo "\`\`\`" >> $OUTPUT_FILE
tree -a -I "$EXCLUDE_DIRS" >> $OUTPUT_FILE
echo "\`\`\`" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "---" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "## Contents of JavaScript, SCSS, Handlebars, Markdown, JSON, Config files, and Hidden Files:" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# List the relevant files, including config and hidden files
FILES=$(find . -type f \( \
  -name "*.js" -o \
  -name "*.mjs" -o \
  -name "*.scss" -o \
  -name "*.hbs" -o \
  -name "*.json" -o \
  -name "*.config" -o \
  -name "*.md" -o \
  -name "*.sh" -o \
  -name ".*rc" -o \
  -name ".gitignore" -o \
  -name ".nvmrc" \
\) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./venv/*" \
  -not -path "./public/*images*/*" \
  -not -path "./public/uploads/*" \
  -not -path "./public/cache/*" \
  -not -path "./public/*export*/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -not -path "./cache/*")

for FILE in $FILES; do
  # For JSON files in the data directory, include only the first 20 lines
  if [[ "$FILE" == ./data/*.json ]]; then
    echo "### **$FILE**" >> $OUTPUT_FILE
    echo "\`\`\`json" >> $OUTPUT_FILE
    head -n 20 "$FILE" >> $OUTPUT_FILE
    echo "..." >> $OUTPUT_FILE
    echo "\`\`\`" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
  else
    echo "### **$FILE**" >> $OUTPUT_FILE
    echo "\`\`\`" >> $OUTPUT_FILE
    cat "$FILE" >> $OUTPUT_FILE
    echo "\`\`\`" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
  fi
done
