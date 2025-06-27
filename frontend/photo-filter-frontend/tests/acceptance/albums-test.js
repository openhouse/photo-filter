// tests/acceptance/albums-test.js

import { module, test } from 'qunit';
import { visit, click, findAll, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'photo-filter-frontend/tests/helpers';

module('Acceptance | albums', function (hooks) {
  setupApplicationTest(hooks);

  test('Visiting /albums shows the album list', async function (assert) {
    // 1. Go to /albums
    await visit('/albums');

    // 2. Confirm we landed on the correct route
    assert.strictEqual(currentURL(), '/albums', 'We are on the /albums route');

    // 3. Check that album links appear in the sidebar menu
    let albumLinks = findAll('.menu li a');
    assert.ok(
      albumLinks.length > 0,
      `Expected at least one album link in the sidebar, found ${albumLinks.length}`,
    );

    // Just to demonstrate how many albums we found
    console.log(`Found ${albumLinks.length} album link(s)`);
  });

  test('Clicking an album link transitions to that album’s route', async function (assert) {
    // 1. Visit /albums
    await visit('/albums');
    assert.strictEqual(
      currentURL(),
      '/albums',
      'We start on the /albums route',
    );

    // 2. Grab all the album links
    let albumLinks = findAll('.menu li a');
    assert.ok(albumLinks.length > 0, 'We have at least one album link');

    // 3. Click the first album link
    await click(albumLinks[0]);

    // 4. The current URL should now reflect that album’s route
    let url = currentURL();
    assert.ok(
      url.startsWith('/albums/'),
      'After clicking the first album link, we navigate to /albums/:album_id',
    );

    // 5. Verify that the photo grid or similar content is displayed
    // In your photo-grid.hbs, the root container is class="grid ..."
    // So let's confirm that .grid is in the DOM
    assert
      .dom('.grid')
      .exists('The photo-grid component (with class `.grid`) is displayed');

    // 6. Check for photo items
    // In your photo-grid.hbs, each item is inside a .card or .photo-item, so adjust as needed
    let photoCards = findAll('.card');
    assert.ok(photoCards.length > 0, 'We see at least one .card in the album');

    // 7. Confirm an image is displayed
    assert
      .dom('.card figure img')
      .exists('An image is rendered for each photo item');
  });
});
