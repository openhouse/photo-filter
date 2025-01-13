# TypeScript Integration Guide

Welcome to the Photo Filter Application’s TypeScript integration guide. This document explains how we are progressively introducing TypeScript into both our **backend** (Express.js) and **frontend** (Ember.js) projects, including linting, Prettier, and shared data interface practices.

---

## Table of Contents

1. **Motivation**
2. **Backend (Express) Setup**
   - Installing Dependencies
   - Creating `tsconfig.json`
   - Updating `package.json` Scripts
   - Renaming `.js` to `.ts`
3. **Frontend (Ember) Setup**
   - Installing Ember TypeScript
   - Creating or Modifying `tsconfig.json`
   - Typical File Renaming Strategy
4. **Shared Data Interfaces**
5. **Linting & Prettier**
6. **Phased Migration Strategy**
7. **References & Next Steps**

---

## 1. Motivation

- **Consistency**: Make the codebase approachable across backend and frontend.
- **Safety**: Catch type mismatches, especially around date values, route params, and Photos metadata.
- **Collaboration**: Provide a single source of truth for shared data interfaces.

We are doing a **phased** approach: not rewriting everything in TypeScript at once, but introducing `.ts` or `.d.ts` files as we modify or create new files.

---

## 2. Backend (Express) Setup

### 2.1 Installing Dependencies

At the **root** of your `backend/` folder, run:

```bash
cd backend
npm install --save-dev typescript @types/node @types/express
```

If you also want to type-assert your tests (e.g., Jest), add:

```bash
npm install --save-dev @types/jest
```

### 2.2 Creating `tsconfig.json`

In `backend/`, create a file called `tsconfig.json` (see example below).

### 2.3 Updating `package.json` Scripts

In the `backend/package.json`, add or update scripts like:

```jsonc
{
  "scripts": {
    // ...
    "build:ts": "tsc --build",
    "start:ts": "npm run build:ts && node dist/server.js"
  }
}
```

This way, you can compile your `.ts` files into a `dist/` folder, then run them.

### 2.4 Renaming `.js` to `.ts`

- Start small: pick a single file, e.g. `server.js`. Rename it to `server.ts` and fix the imports.
- Update your imports to use TypeScript/ES modules style if needed, e.g.:
  ```ts
  import express from "express";
  ```
- Over time, continue converting controllers or utility files from `.js` → `.ts`.

---

## 3. Frontend (Ember) Setup

### 3.1 Installing Ember TypeScript

Inside your Ember app folder (`frontend/photo-filter-frontend`), run:

```bash
cd frontend/photo-filter-frontend
ember install ember-cli-typescript
```

This will create or modify certain TypeScript configuration files (like `tsconfig.json`), add the TypeScript compiler, and wire up Ember to handle `.ts` files.

### 3.2 Creating or Modifying `tsconfig.json`

If `ember-cli-typescript` doesn’t create a `tsconfig.json`, you can add one. (We provide a sample below.) Typically, `ember-cli-typescript` does the heavy lifting. Just ensure it references your desired TypeScript settings.

### 3.3 Typical File Renaming Strategy

- Start by renaming one or two Ember files, e.g. a service or a component, from `.js` → `.ts`.
- Fix the import statements and specify the class property types. For example:

  ```ts
  import Service from "@ember/service";

  export default class CurrentAlbumService extends Service {
    isAlbumRoute = false;
    albumTitle: string | null = null;
    // ...
  }
  ```

- If you see errors about “Cannot find module ...”, try re-running `npm run start` or `npm run lint`. The Ember CLI often picks up the new `.ts` files automatically.

---

## 4. Shared Data Interfaces

We frequently pass data between the Node backend and the Ember frontend in JSON. For instance, we have `Photo` or `Album` objects. We want a single source of truth, so we can do either:

1. **A Shared Folder** (e.g. `shared-types/` at the top-level) with `.d.ts` or `.ts` files that define `interface PhotoData { ... }`.
2. Then import them into `backend/` for Node usage, and also reference them in Ember.

**Example**:

```ts
// shared-types/PhotoData.ts
export interface PhotoData {
  uuid: string;
  originalFilename: string;
  date: string; // or Date if we handle parsing
  persons?: string[];
  // ...
}
```

**In backend**:

```ts
import { PhotoData } from "../../shared-types/PhotoData";

function processPhoto(photo: PhotoData) {
  // ...
}
```

**In Ember**:

```ts
import PhotoData from "photo-filter-frontend/shared-types/PhotoData";

// Then use PhotoData in a typed model or utility
```

This ensures the same shape is recognized across the stack.

---

## 5. Linting & Prettier

We already use ESLint + Prettier. Add or verify in `.eslintrc.js` that TypeScript is recognized:

```js
// Example snippet
module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:ember/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  // ...
};
```

**Prettier**: Make sure your `.prettierrc.js` also covers `.ts`:

```js
module.exports = {
  overrides: [
    {
      files: "*.{ts,js,json}",
      options: {
        singleQuote: true,
        // ...
      },
    },
  ],
};
```

---

## 6. Phased Migration Strategy

1. **Backend**: Convert `server.js` → `server.ts`, then your controllers, then your utilities.
2. **Frontend**: After `ember-cli-typescript` is installed, rename a small but crucial file (like a service or a component).
3. **Shared Types**: Start with a minimal `PhotoData` or `AlbumData` interface. Evolve it as you unify the codebase.

We encourage the approach: **“Convert as you touch.”** Each time you need to fix a bug in a file, rename it to `.ts` or add types. Over time, your coverage increases organically.

---

## 7. References & Next Steps

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ember-cli-typescript Docs](https://emberjs.github.io/ember-cli-typescript/)
- [@typescript-eslint](https://typescript-eslint.io/) for linting
- **WIP**: We may eventually compile a single “combined” type definitions library used by the Python layer too, ensuring Apple Photos metadata is typed end-to-end.

_That’s it!_ If you have any issues or want clarifications, see the [ISSUES.md](./ISSUES.md) file or open a new discussion with your questions.
