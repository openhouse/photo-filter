import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | photo-tile', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders img for images and video tag for videos', async function (assert) {
    this.setProperties({
      dummyAlbum: 'ALBUM',
      imagePhoto: {
        exportedFilename: 'foo.jpg',
        mediaType: 'image',
        isVideo: false,
      },
      videoPhoto: {
        exportedFilename: 'bar.mov',
        mediaType: 'video',
        isVideo: true,
      },
    });

    await render(hbs`
      <PhotoTile @photo={{this.imagePhoto}} @albumUUID={{this.dummyAlbum}} />
    `);
    assert.dom('img').exists('renders <img> for still');

    await render(hbs`
      <PhotoTile @photo={{this.videoPhoto}} @albumUUID={{this.dummyAlbum}} />
    `);
    assert.dom('video').exists('renders <video> for motion');
  });
});
