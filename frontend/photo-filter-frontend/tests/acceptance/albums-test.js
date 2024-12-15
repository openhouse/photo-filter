// frontend/photo-filter-frontend/tests/acceptance/albums-test.js

import { module, test } from 'qunit';
import { visit, click, findAll, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from '../helpers/index.js';

module('Acceptance | albums', function (hooks) {
  setupApplicationTest(hooks);

  test('visiting /albums and viewing an album', async function (assert) {
    await visit('/albums');

    assert.strictEqual(currentURL(), '/albums');
    assert.dom('h1').hasText('Select an Album');

    const albumLinks = findAll('a');
    assert.ok(albumLinks.length > 0, 'There are album links');

    // Click the first album link
    await click(albumLinks[0]);

    // The URL should change to the album route
    assert.ok(currentURL().startsWith('/albums/'), 'Navigated to album route');

    // Check that photos are displayed
    assert.dom('.photo-grid').exists('Photo grid is displayed');
    assert
      .dom('.photo-item')
      .exists({ count: 1 }, 'At least one photo is displayed');

    // Check that images have loaded
    assert.dom('.photo-item img').exists('Photo image is displayed');
  });
});
