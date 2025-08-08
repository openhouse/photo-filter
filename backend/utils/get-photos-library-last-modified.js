import fs from 'fs-extra';
import os from 'os';
import path from 'path';

// Returns the last-modified time of a file in the Photos library that
// reliably changes when the library is updated; falls back safely.
export async function getPhotosLibraryLastModified() {
  const home = os.homedir();
  const candidates = [
    path.join(home, 'Pictures', 'Photos Library.photoslibrary', 'database', 'Photos.sqlite'),
    path.join(home, 'Pictures', 'Photos Library.photoslibrary'),
  ];
  for (const p of candidates) {
    if (await fs.pathExists(p)) {
      const stat = await fs.stat(p);
      return new Date(stat.mtimeMs);
    }
  }
  return null;
}
