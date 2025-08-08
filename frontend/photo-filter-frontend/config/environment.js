'use strict';

module.exports = function (environment) {
  const backendHost = process.env.BACKEND_HOST || 'http://localhost:3000';
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

    backendHost,
    APP: {
      apiHost: backendHost,
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
