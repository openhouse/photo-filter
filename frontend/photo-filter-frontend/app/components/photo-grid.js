import Component from '@glimmer/component';
import config from 'photo-filter-frontend/config/environment';

/**
 * PhotoGrid Component
 *
 * Arguments:
 * - @photos: An array of photo objects.
 * - @albumUUID: The album's UUID for constructing image URLs.
 * - @sortAttribute: The current sorting attribute to display values for.
 */
export default class PhotoGridComponent extends Component {
  get apiHost() {
    return config.APP.apiHost;
  }
}
