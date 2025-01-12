// frontend/photo-filter-frontend/tests/acceptance/person-filtering-test.js

import { module, test } from 'qunit';
import { visit, click, findAll, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from '../helpers/index.js';

module('Acceptance | Person Filtering', function (hooks) {
  setupApplicationTest(hooks);

  test('toggle multiple people in an album', async function (assert) {
    await visit('/albums');
    assert.strictEqual(currentURL(), '/albums', 'At the albums index route');

    // Click the first album link
    const albumLinks = findAll('.menu li a');
    assert.ok(albumLinks.length > 0, 'We have at least one album link');
    await click(albumLinks[0]);

    // Now should be /albums/:album_id
    let url = currentURL();
    assert.ok(url.startsWith('/albums/'), 'Navigated to an album detail route');

    // There should be person toggle buttons
    const personButtons = findAll('.btn.btn-xs');
    assert.ok(personButtons.length > 0, 'Person toggles exist on the page');

    // Toggle the first person
    await click(personButtons[0]);
    url = currentURL();
    assert.ok(
      url.includes('persons='),
      'URL now contains persons query param after toggling',
    );

    // Optionally toggle a second person if available
    if (personButtons.length > 1) {
      await click(personButtons[1]);
      url = currentURL();
      assert.ok(
        url.includes('%2C'),
        'Multiple persons are included in the query param (comma-encoded)',
      );
    }
  });
});
