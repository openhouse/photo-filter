#!/usr/bin/env node
// Hardened backend setup: self-heal pip and pin osxphotos.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VENV_DIR = path.join(ROOT, 'venv');
const PY311 = path.join(VENV_DIR, 'bin', 'python3');
const PY = fs.existsSync(PY311) ? PY311 : path.join(VENV_DIR, 'bin', 'python');

const ENV = {
  ...process.env,
  PYTHONNOUSERSITE: '1',
  PIP_DISABLE_PIP_VERSION_CHECK: '1',
  LC_ALL: process.env.LC_ALL || 'C.UTF-8',
  LANG: process.env.LANG || 'C.UTF-8',
};

const OSXPHOTOS_SPEC =
  process.env.OSXPHOTOS_SPEC ||
  // Commit adding nested .utc/.local postfix support
  'git+https://github.com/openhouse/osxphotos.git@0a9f561#egg=osxphotos';

function sh(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: { ...ENV, ...(opts.env || {}) },
    ...opts,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const msg = [
      `${cmd} ${args.join(' ')} failed with code ${res.status}`,
      res.stdout && `stdout:\n${res.stdout}`,
      res.stderr && `stderr:\n${res.stderr}`,
    ]
      .filter(Boolean)
      .join('\n');
    const err = new Error(msg);
    err.stdout = res.stdout;
    err.stderr = res.stderr;
    err.status = res.status;
    throw err;
  }
  return res.stdout ? res.stdout.trim() : '';
}

function ensureVenv() {
  if (fs.existsSync(PY)) {
    console.log('✔ virtual‑env already present – skipping creation');
    return;
  }
  console.log('✔ creating backend/venv');
  sh('python3', ['-m', 'venv', VENV_DIR], { stdio: 'inherit' });
}

function pipOk() {
  try {
    sh(PY, ['-m', 'pip', '--version']);
    return true;
  } catch {
    return false;
  }
}

function repairPip() {
  console.warn('⚠ pip looks broken; attempting repair with ensurepip …');
  try {
    sh(PY, ['-m', 'ensurepip', '--upgrade'], { stdio: 'inherit' });
  } catch {
    console.warn('⚠ ensurepip failed; recreating venv …');
    try { fs.rmSync(VENV_DIR, { recursive: true, force: true }); } catch {}
    sh('python3', ['-m', 'venv', VENV_DIR], { stdio: 'inherit' });
  }
  sh(PY, ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'], {
    stdio: 'inherit',
  });
}

function installOsxphotos() {
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('Installing osxphotos from: ', OSXPHOTOS_SPEC);
  console.log('───────────────────────────────────────────────────────────────────────');
  sh(PY, ['-m', 'pip', 'install', '--upgrade', '--force-reinstall', OSXPHOTOS_SPEC], {
    stdio: 'inherit',
  });
}

(function main() {
  try {
    ensureVenv();
    if (!pipOk()) repairPip();
    installOsxphotos();
    const ver = sh(PY, ['-c', 'import osxphotos; print(osxphotos.__version__)']);
    console.log(`[setup] osxphotos version installed: ${ver}`);
    console.log('✔ backend setup complete');
    process.exit(0);
  } catch (err) {
    console.warn('❌ backend/scripts/setup.js failed:', err.message || err);
    console.warn('Continuing install; the dev bootstrap will repair this during "npm run super-dev".');
    process.exit(0);
  }
})();
