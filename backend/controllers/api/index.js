// backend/controllers/api/index.js
//
// This is unchanged except that we ensure we’re exporting
// the newly-updated getPhotosByAlbumData from photos-controller.js

export { getAlbumsData, getAlbumById } from "./albums-controller.js";
export { getPhotosByAlbumData } from "./photos-controller.js";
