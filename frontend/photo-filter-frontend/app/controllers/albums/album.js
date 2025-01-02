// app/controllers/albums/album.js
import { inject as service } from '@ember/service';
import PhotoCollectionController from 'photo-filter-frontend/controllers/photo-collection';

export default class AlbumsAlbumController extends PhotoCollectionController {
  @service router;

  queryParams = [
    'sort',
    'order',
    {
      persons: {
        // We want persons to be array-based
        serialize(value) {
          return JSON.stringify(value);
        },
        deserialize(value) {
          if (typeof value === 'string') {
            try {
              return JSON.parse(value);
            } catch {
              return [];
            }
          }
          return value || [];
        },
      },
    },
  ];

  // Because we’re extending PhotoCollectionController,
  // we already have @tracked sort, order, persons, etc.

  // Our route model() sets `this.model.photos`.
  // It also sets `this.model.isDataReady`.

  /**
   * Each time we update sort/order/persons, we want to re-trigger
   * a route transition to set the query params in the URL.
   */
  _updateRouteQueryParams(params) {
    this.router.transitionTo(
      'albums.album',
      this.router.currentRoute.params.album_id,
      {
        queryParams: params,
      },
    );
  }
}
