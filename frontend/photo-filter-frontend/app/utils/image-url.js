import ENV from 'photo-filter-frontend/config/environment';

export function albumIdFor(photo) {
  return photo.belongsTo?.('album')?.id?.() ??
         photo.album?.id ??
         photo.album ?? '';
}

export default function imageUrl(photo) {
  const albumId = albumIdFor(photo);
  const file = photo.exportedFilename;
  return `${ENV.backendHost}/images/${albumId}/${file}`;
}
