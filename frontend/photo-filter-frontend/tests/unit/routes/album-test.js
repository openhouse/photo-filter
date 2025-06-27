// tests/unit/routes/album-test.js

import { module, test } from 'qunit';
import { setupTest } from 'photo-filter-frontend/tests/helpers';

module('Unit | Route | album', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    // Correctly look up the nested route
    let route = this.owner.lookup('route:albums/album');
    assert.ok(route);
  });
});
