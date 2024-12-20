import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
  @service router;
  @service currentAlbum;

  @action
  updateSortAttribute(event) {
    const newSort = event.target.value;
    if (this.currentAlbum.isAlbumRoute) {
      const routeName = 'albums.album';
      const currentRoute = this.router.currentRouteName;
      if (currentRoute.startsWith('albums.album')) {
        this.router.transitionTo(
          routeName,
          this.router.currentRoute.params.album_id,
          {
            queryParams: {
              sort: newSort,
              order: this.currentAlbum.sortOrder,
            },
          },
        );
      }
    }
  }

  @action
  updateSortOrder(event) {
    const newOrder = event.target.value;
    if (this.currentAlbum.isAlbumRoute) {
      const routeName = 'albums.album';
      const currentRoute = this.router.currentRouteName;
      if (currentRoute.startsWith('albums.album')) {
        this.router.transitionTo(
          routeName,
          this.router.currentRoute.params.album_id,
          {
            queryParams: {
              sort: this.currentAlbum.sortAttribute,
              order: newOrder,
            },
          },
        );
      }
    }
  }
}
