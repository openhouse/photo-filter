import dotenv from "dotenv";
import { EventEmitter } from "events";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ override: true, quiet: true });
EventEmitter.defaultMaxListeners = Math.max(EventEmitter.defaultMaxListeners || 0, 50);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tmpRoot = path.resolve(__dirname, "..", "..", ".tmp-test-storage");
const localRoot = path.join(tmpRoot, "local");
const exportRoot = path.join(tmpRoot, "exports");

fs.ensureDirSync(localRoot);
fs.ensureDirSync(exportRoot);

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.PF_SKIP_LEGACY_SYMLINK = process.env.PF_SKIP_LEGACY_SYMLINK || "1";
process.env.PF_LOCAL_ROOT = localRoot;
process.env.PF_EXPORT_ROOT = exportRoot;
