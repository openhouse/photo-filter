// ./controllers/get-albums.js

import {
  albumsPaths,
  ensureAlbumsExported,
  EXPORT_RETRY_AFTER_SECONDS,
  isTransientJsonError,
  readJsonWithRetry,
} from "../utils/albums-store.js";

// Function to get the list of albums
export const getAlbums = async (req, res) => {
  try {
    await ensureAlbumsExported();
    const albumsData = await readJsonWithRetry(albumsPaths.albumsPath);

    // Render albums view
    res.render("albums", { albums: albumsData });
  } catch (error) {
    if (isTransientJsonError(error)) {
      res
        .status(503)
        .set("Retry-After", EXPORT_RETRY_AFTER_SECONDS.toString())
        .send("Albums export in progress. Please retry shortly.");
      return;
    }

    console.error("Error fetching albums:", error);
    res.status(500).send("Internal Server Error");
  }
};
