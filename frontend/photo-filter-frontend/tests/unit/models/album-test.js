import { setupTest } from 'photo-filter-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | album', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('album', {});
    assert.ok(model, 'model exists');
  });
});
