// ./utils/get-photos-library-last-modified.js

import fs from "fs-extra";
import path from "path";
import os from "os";

export async function getPhotosLibraryLastModified() {
  const photosLibraryPath = path.join(
    os.homedir(),
    "Pictures",
    "Photos Library.photoslibrary"
  );

  const stats = await fs.stat(photosLibraryPath);
  return stats.mtime;
}
