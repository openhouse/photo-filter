import ENV from 'photo-filter-frontend/config/environment';

export default function imageUrl(photo) {
  const file = photo.exportedFilename;
  return `${ENV.backendHost}/p/${file}`;
}
