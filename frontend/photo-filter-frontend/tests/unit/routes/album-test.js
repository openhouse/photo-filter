import { module, test } from 'qunit';
import { setupTest } from 'photo-filter-frontend/tests/helpers';

module('Unit | Route | album', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:album');
    assert.ok(route);
  });
});
