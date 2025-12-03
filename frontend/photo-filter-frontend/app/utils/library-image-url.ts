import config from 'photo-filter-frontend/config/environment';

export function libraryImageUrl(filename?: string | null, options?: { host?: string | null }) {
  if (!filename) return null;
  const host = options?.host ?? (config.APP.apiHost as string | undefined) ?? '';
  const normalizedHost = host.replace(/\/+$/, '');
  const encoded = encodeURIComponent(filename);
  return `${normalizedHost}/library/images/${encoded}`;
}

export default libraryImageUrl;
