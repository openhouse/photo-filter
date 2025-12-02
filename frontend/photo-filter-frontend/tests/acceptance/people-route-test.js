import { module, test } from 'qunit';
import { visit, currentURL, findAll, click, settled } from '@ember/test-helpers';
import { setupApplicationTest } from 'photo-filter-frontend/tests/helpers';

function buildResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.api+json',
    },
  });
}

const ascPayload = {
  data: [
    {
      type: 'person',
      id: 'carol',
      attributes: {
        name: 'Carol',
        photoCount: 4,
        medianPhotoAt: '2019-05-02T00:00:00Z',
      },
    },
    {
      type: 'person',
      id: 'alice',
      attributes: {
        name: 'Alice',
        photoCount: 3,
        medianPhotoAt: '2020-01-02T00:00:00Z',
      },
    },
    {
      type: 'person',
      id: 'bob',
      attributes: {
        name: 'Bob',
        photoCount: 2,
        medianPhotoAt: '2021-01-01T12:00:00Z',
      },
    },
  ],
  meta: { sort: 'medianPhotoAt', order: 'asc' },
};

const descPayload = {
  data: [...ascPayload.data].reverse(),
  meta: { sort: 'medianPhotoAt', order: 'desc' },
};

module('Acceptance | people route', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.originalFetch = window.fetch;
    window.fetch = async (input, options = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      const parsed = new URL(url, window.location.origin);

      if (parsed.pathname.endsWith('/api/albums')) {
        return buildResponse({ data: [] });
      }

      if (parsed.pathname.endsWith('/api/library/people')) {
        const order = parsed.searchParams.get('order') || 'asc';
        return buildResponse(order === 'desc' ? descPayload : ascPayload);
      }

      if (this.originalFetch) {
        return this.originalFetch(input, options);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };
  });

  hooks.afterEach(function () {
    window.fetch = this.originalFetch;
  });

  test('People route lists people and supports toggling order', async function (assert) {
    await visit('/people');

    assert.strictEqual(currentURL(), '/people', 'navigated to /people');

    let names = findAll('.person-name').map((el) => el.textContent.trim());
    assert.deepEqual(
      names,
      ['Carol', 'Alice', 'Bob'],
      'renders people sorted by ascending medianPhotoAt',
    );

    await click('[data-test-toggle-order]');
    await settled();

    names = findAll('.person-name').map((el) => el.textContent.trim());
    assert.deepEqual(
      names,
      ['Bob', 'Alice', 'Carol'],
      'reorders people when sort order toggles',
    );
  });
});
