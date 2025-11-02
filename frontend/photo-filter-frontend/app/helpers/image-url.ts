import { helper } from '@ember/component/helper';
import config from 'photo-filter-frontend/config/environment';
import imageUrl from 'photo-filter-frontend/utils/image-url';

type Positional = [string, string];

type NamedArgs = {
  host?: string;
};

export default helper(function imageUrlHelper(
  [albumUUID, filename]: Positional,
  named: NamedArgs = {},
) {
  const hostValue = named.host ?? (config.APP.apiHost as string | undefined);
  return imageUrl(albumUUID, filename, { host: hostValue });
});
