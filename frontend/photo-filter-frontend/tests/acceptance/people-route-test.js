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

  test('person route builds correct image URLs and preserves QPs', async function (assert) {
    await visit('/people/Jamie%20Burkart?sort=score.highlight_visibility&order=desc&solo=false');
    assert.strictEqual(
      currentURL(),
      '/people/Jamie%20Burkart?sort=score.highlight_visibility&order=desc&solo=false'
    );

    const imgs = findAll('img');
    assert.ok(imgs.length > 0, 'renders some images');
    imgs.slice(0, 5).forEach((img) => {
      assert.ok(
        /\/p\/\d{8}T\d{6}\d{6}Z-/.test(img.src),
        'img src uses global media path'
      );
    });

    await click('[data-test-solo-toggle]');
    assert.ok(currentURL().includes('solo=true'), 'URL includes solo=true after toggle');
    assert.ok(
      currentURL().includes('sort=score.highlight_visibility'),
      'sort param preserved'
    );
    assert.ok(currentURL().includes('order=desc'), 'order param preserved');
  });
});
