// tests/acceptance/person-filtering-test.js

import { module, test } from 'qunit';
import { visit, click, findAll, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'photo-filter-frontend/tests/helpers';

module('Acceptance | Person Filtering', function (hooks) {
  setupApplicationTest(hooks);

  test('toggle multiple people in an album', async function (assert) {
    // 1. Visit /albums
    await visit('/albums');
    assert.strictEqual(currentURL(), '/albums', 'We are at the /albums route');

    // 2. Click the first album link
    const albumLinks = findAll('.menu li a');
    assert.ok(
      albumLinks.length > 0,
      'We have at least one album link in the sidebar',
    );
    await click(albumLinks[0]);

    // 3. We should now be at /albums/:album_id
    let url = currentURL();
    assert.ok(url.startsWith('/albums/'), 'Navigated to an album detail route');

    // 4. The UI should display person toggle buttons
    // In your album.hbs, you have:
    //   {{#each this.model.persons as |person|}}
    //     <button type="button" class="btn btn-xs" ...>
    const personButtons = findAll('.btn.btn-xs');
    assert.ok(
      personButtons.length > 0,
      'Person toggles exist on the page for filtering',
    );

    // 5. Toggle the first person
    await click(personButtons[0]);

    // 6. Check that the URL now includes a query param for persons
    url = currentURL();
    assert.ok(
      url.includes('persons='),
      'URL now contains persons query param after toggling the first person',
    );

    // 7. Optionally toggle a second person if available
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
