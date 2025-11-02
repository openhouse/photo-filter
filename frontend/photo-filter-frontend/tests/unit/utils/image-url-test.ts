import { module, test } from 'qunit';
import imageUrl from 'photo-filter-frontend/utils/image-url';

module('Unit | Utils | image-url', function () {
  test('builds an image URL with default host', function (assert) {
    const result = imageUrl('album-123', 'My Photo.jpg');
    assert.strictEqual(
      result,
      '/images/album-123/My%20Photo.jpg',
      'encodes filename and album',
    );
  });

  test('prefixes host when provided', function (assert) {
    const result = imageUrl('album-123', 'My Photo.jpg', {
      host: 'http://localhost:3000/',
    });
    assert.strictEqual(
      result,
      'http://localhost:3000/images/album-123/My%20Photo.jpg',
      'trims trailing slash before joining',
    );
  });
});
