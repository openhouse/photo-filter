// Map a file‑extension → generic media type.
// Returns 'image' | 'video' | 'other'
export function mediaTypeFromExt(ext) {
  const e = ext.toLowerCase().replace(/^\./, "");
  if (["jpg", "jpeg", "png", "heic", "gif", "webp", "tiff", "bmp"].includes(e))
    return "image";
  if (["mov", "mp4", "m4v", "hevc", "avi", "mts", "m2ts", "webm"].includes(e))
    return "video";
  return "other";
}
