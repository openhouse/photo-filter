// tests/acceptance/person-filtering-test.js

import { module, test } from 'qunit';
import {
  visit,
  click,
  findAll,
  currentURL,
  settled,
} from '@ember/test-helpers';
import { setupApplicationTest } from 'photo-filter-frontend/tests/helpers';

module('Acceptance | Person Filtering', function (hooks) {
  setupApplicationTest(hooks);

  test('toggle multiple people in an album', async function (assert) {
    // 1. Go to /albums
    await visit('/albums');
    assert.strictEqual(currentURL(), '/albums', 'We are at the /albums route');

    // 2. Grab all album links
    const albumLinks = findAll('.menu li a');
    assert.ok(
      albumLinks.length > 0,
      'We have at least one album link in the sidebar',
    );

    // We'll iterate through each album link in sequence, click it, and see if we find person toggles.
    let foundPersonButtons = false;
    let clickedAlbumIndex = 0;

    for (let i = 0; i < albumLinks.length; i++) {
      // 3. Click this album link
      await click(albumLinks[i]);
      await settled(); // Wait for any async rendering/data

      // 4. Check if this album has .btn.btn-xs elements
      const personButtons = findAll('.btn.btn-xs');
      if (personButtons.length > 0) {
        foundPersonButtons = true;
        clickedAlbumIndex = i;
        break;
      } else {
        // If not found, navigate back to /albums and try the next link
        // (Or skip the "navigate back" step if your app can handle direct re-clicking)
        await visit('/albums');
      }
    }

    // Now, if foundPersonButtons is false, it means we never found an album with people.
    assert.ok(
      foundPersonButtons,
      'Expected to find at least one album that has person toggles',
    );
    if (!foundPersonButtons) {
      // If we truly never found any toggles, we can bail out:
      return;
    }

    // 5. We are now on an album route that does have person toggles
    let url = currentURL();
    assert.ok(
      url.startsWith('/albums/'),
      `Navigated to an album detail route (album index = ${clickedAlbumIndex})`,
    );

    // 6. Confirm we do see those toggles
    const personButtons = findAll('.btn.btn-xs');
    assert.ok(
      personButtons.length > 0,
      'Person toggles exist on the page for filtering',
    );

    // 7. Toggle the first person
    await click(personButtons[0]);

    // 8. Check that the URL now includes a query param for persons
    url = currentURL();
    assert.ok(
      url.includes('persons='),
      'URL now contains persons query param after toggling the first person',
    );

    // 9. Optionally toggle a second person if available
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
