import { helper } from '@ember/component/helper';
import libraryImageUrl from 'photo-filter-frontend/utils/library-image-url';

export default helper(function libraryImageUrlHelper([filename]) {
  return libraryImageUrl(filename);
});
