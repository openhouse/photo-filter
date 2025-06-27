// ./backend/scripts/setup.js
//
// Prepares the Python virtual‑env used by the Express backend:
//
//   • creates backend/venv with Python 3.11 if it does not exist
//   • installs (or upgrades) **osxphotos**
//       – by default pulls Jamie’s fork/branch that adds `.utc/.local`
//         datetime postfix support for filename templates
//       – set the env‑var  OSXPHOTOS_SPEC=osxphotos  to fall back to PyPI
//
// Run automatically by `npm install` via the “postinstall” script.
//

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";
import path from "path";

const execAsync = promisify(exec);

/** absolute path helpers */
const venvDir = path.join(process.cwd(), "venv");
const venvPython = path.join(venvDir, "bin", "python3");
const venvPip = path.join(venvDir, "bin", "pip");

/** which Python binary to create the venv with */
const PYTHON_EXE = "python3.11";

/** default pip‑install spec for Jamie’s experimental branch */
const DEFAULT_FORK_SPEC =
  "git+https://github.com/openhouse/osxphotos.git" +
  "@codex/implement-utc-and-local-postfix-for-template-datetime" +
  "#egg=osxphotos";

/** caller can override with  OSXPHOTOS_SPEC=… */
const OSXPHOTOS_SPEC = process.env.OSXPHOTOS_SPEC || DEFAULT_FORK_SPEC;

/** tiny helper for console blocks */
function banner(msg) {
  console.log("\n" + "─".repeat(72) + `\n${msg}\n` + "─".repeat(72));
}

(async () => {
  try {
    // ---------------------------------------------------------------------
    // 1 · Ensure virtual‑env exists
    // ---------------------------------------------------------------------
    const venvExists = await fs.pathExists(venvPython);
    if (!venvExists) {
      banner(`Creating Python virtual‑env   (${PYTHON_EXE})`);
      await execAsync(`${PYTHON_EXE} -m venv venv`);
    } else {
      console.log("✔ virtual‑env already present – skipping creation");
    }

    // ---------------------------------------------------------------------
    // 2 · Install / upgrade osxphotos from the requested spec
    // ---------------------------------------------------------------------
    banner(`Installing osxphotos from:  ${OSXPHOTOS_SPEC}`);
    await execAsync(`"${venvPip}" install --upgrade "${OSXPHOTOS_SPEC}"`);

    banner("Setup succeeded – backend Python tooling ready.");
  } catch (err) {
    console.error("❌ backend/scripts/setup.js failed:", err);
    process.exit(1);
  }
})();
