import { module, test } from 'qunit';
import { setupTest } from 'photo-filter-frontend/tests/helpers';

module('Unit | Route | albums', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:albums');
    assert.ok(route);
  });
});
