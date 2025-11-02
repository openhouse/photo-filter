interface ImageUrlOptions {
  host?: string | null | undefined;
}

export function imageUrl(
  albumUUID: string,
  filename: string,
  options: ImageUrlOptions = {},
): string {
  if (!albumUUID) {
    throw new Error("imageUrl requires an albumUUID");
  }
  if (!filename) {
    throw new Error("imageUrl requires a filename");
  }

  const encodedAlbum = encodeURIComponent(albumUUID);
  const encodedFile = encodeURIComponent(filename);
  const path = `/images/${encodedAlbum}/${encodedFile}`;

  if (options.host) {
    return `${options.host.replace(/\/+$/, "")}${path}`;
  }

  return path;
}

export default imageUrl;
