// app/router.js
import EmberRouter from '@ember/routing/router';
import config from './config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  // Existing route for albums
  this.route('albums', function () {
    this.route('album', { path: '/:album_id' });
  });

  // NEW date-based routes
  this.route('dates', function () {
    this.route('year', { path: '/:year' }, function () {
      this.route('month', { path: '/:month' }, function () {
        this.route('day', { path: '/:day' });
      });
    });
  });
});
