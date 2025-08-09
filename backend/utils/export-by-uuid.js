// backend/utils/export-by-uuid.js
import fs from "fs-extra";
import { spawn } from "child_process";

export async function exportByUuids(osxphotosBin, destDir, uuids, opts = {}) {
  if (!Array.isArray(uuids) || uuids.length === 0) return;
  await fs.ensureDir(destDir);
  const template =
    opts.template ||
    "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}.jpg";

  const args = [
    "export",
    destDir,
    "--uuid",
    ...uuids,
    "--filename",
    template,
    "--download-missing",
    "--update",
    "--sidecar",
    "none",
    "--convert-to-jpeg",
  ];

  const jpegQuality =
    opts.jpegQuality ?? process.env.JPEG_QUALITY ?? "0.92";
  if (jpegQuality) {
    args.push("--jpeg-quality", String(jpegQuality));
  }

  const usePhotoKit =
    opts.usePhotoKit ?? process.env.USE_PHOTOKIT === "1";
  if (usePhotoKit) args.push("--use-photokit");

  await new Promise((resolve, reject) => {
    const child = spawn(osxphotosBin, args, { stdio: ["ignore", "pipe", "pipe"] });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`osxphotos exited with code ${code}`));
    });
  });
}
