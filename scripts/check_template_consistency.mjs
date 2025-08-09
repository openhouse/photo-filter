#!/usr/bin/env node
import fs from 'fs';

const locations = [
  { file: '.env.example', type: 'env' },
  { file: 'README.md', type: 'md' },
  { file: 'backend/README.md', type: 'md' },
  { file: 'docs/adr/0003-canonical-filename-template.md', type: 'md' },
  { file: 'scripts/build_filename_index.py', type: 'py' },
];

const templateRegex = /\{created\.utc\.strftime,[^}]+}-\{original_name\}\{ext\}/;

function extract(entry) {
  const text = fs.readFileSync(entry.file, 'utf8');
  if (entry.type === 'env') {
    const m = text.match(/^FILENAME_TEMPLATE=(.+)$/m);
    return m ? m[1].trim() : null;
  }
  if (entry.type === 'py') {
    const m = text.match(/DEFAULT_TEMPLATE\s*=\s*"([^"]+)"/);
    return m ? m[1] : null;
  }
  const m = text.match(templateRegex);
  return m ? m[0] : null;
}

const values = locations.map((l) => ({ ...l, value: extract(l) }));
const missing = values.filter((v) => !v.value);
if (missing.length) {
  console.error('Template missing in files:');
  missing.forEach((v) => console.error(' ', v.file));
  process.exit(1);
}
const unique = [...new Set(values.map((v) => v.value))];
if (unique.length !== 1) {
  console.error('Template mismatch:');
  values.forEach((v) => console.error(`${v.file}: ${v.value}`));
  process.exit(1);
}
console.log('All template strings match:', unique[0]);
