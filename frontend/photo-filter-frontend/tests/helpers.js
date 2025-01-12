// tests/helpers.js

import {
  setupApplicationTest as upstreamSetupApplicationTest,
  setupRenderingTest as upstreamSetupRenderingTest,
  setupTest as upstreamSetupTest,
} from 'ember-qunit';

// This file provides wrappers around ember-qunit's test setup functions.
// Additional per-test-type setup could be added here.

export function setupApplicationTest(hooks, options) {
  upstreamSetupApplicationTest(hooks, options);

  // For example:
  // hooks.beforeEach(async function () {
  //   // e.g., authenticateSession(); // for ember-simple-auth
  // });
}

export function setupRenderingTest(hooks, options) {
  upstreamSetupRenderingTest(hooks, options);
}

export function setupTest(hooks, options) {
  upstreamSetupTest(hooks, options);
}
