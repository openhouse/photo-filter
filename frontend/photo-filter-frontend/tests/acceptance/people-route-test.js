import { module, test } from 'qunit';
import { visit, currentURL, click, findAll } from '@ember/test-helpers';
import { setupApplicationTest } from 'photo-filter-frontend/tests/helpers';

module('Acceptance | people routes', function (hooks) {
  setupApplicationTest(hooks);

  test('visiting /people and navigating to a person', async function (assert) {
    await visit('/people');
    assert.strictEqual(currentURL(), '/people', 'We are on the /people route');

    const links = findAll('ul.menu li a');
    assert.ok(links.length > 0, 'There is at least one person link');

    await click(links[0]);
    assert.ok(currentURL().startsWith('/people/'), 'Navigated to a person route');

    await click('button');
    assert.ok(
      currentURL().includes('solo=true'),
      'URL contains solo query param after toggling'
    );
  });
});
