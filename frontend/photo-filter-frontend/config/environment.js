'use strict';

module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'photo-filter-frontend',
    environment,
    rootURL: '/',
    locationType: 'history',
    historySupportMiddleware: true, // enable for ember-router-scroll
    EmberENV: {
      EXTEND_PROTOTYPES: false,
      FEATURES: {},
    },

    APP: {
      apiHost: 'http://localhost:3000',
    },

    // Add routerScroll configuration here
    routerScroll: {
      targetElement: '#main-content-area',
    },
  };

  if (environment === 'development') {
    // ...
  }

  if (environment === 'test') {
    ENV.locationType = 'none';
    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  if (environment === 'production') {
    // ...
  }

  return ENV;
};
