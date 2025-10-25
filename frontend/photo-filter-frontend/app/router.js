import EmberRouter from '@ember/routing/router';
import config from 'photo-filter-frontend/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('albums', function () {
    this.route('album', { path: '/:album_id' });
  });
  this.route('people', function () {
    this.route('person', { path: '/:person_name' });
  });
});
