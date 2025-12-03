import { helper } from '@ember/component/helper';
import libraryImageUrl from 'photo-filter-frontend/utils/library-image-url';

interface LibraryImageUrlSignature {
  Args: {
    Positional: [string | null | undefined];
  };
  Return: string | null;
}

export default helper<LibraryImageUrlSignature>(function libraryImageUrlHelper([filename]) {
  return libraryImageUrl(filename);
});
