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
      const currentRoute = this.router.currentRouteName;
      let routeName, paramName;
      if (currentRoute.startsWith('albums.album')) {
        routeName = 'albums.album';
        paramName = 'album_id';
      } else if (currentRoute.startsWith('people.person')) {
        routeName = 'people.person';
        paramName = 'person_name';
      }
      if (routeName && paramName) {
        const queryParams = {
          sort: newSort,
          order: this.currentAlbum.sortOrder,
        };
        if (currentRoute.startsWith('people.person')) {
          queryParams.solo = this.router.currentRoute.queryParams.solo;
        }
        this.router.transitionTo(routeName, this.router.currentRoute.params[paramName], {
          queryParams,
        });
      }
    }
  }

  @action
  updateSortOrder(event) {
    const newOrder = event.target.value;
    if (this.currentAlbum.isAlbumRoute) {
      const currentRoute = this.router.currentRouteName;
      let routeName, paramName;
      if (currentRoute.startsWith('albums.album')) {
        routeName = 'albums.album';
        paramName = 'album_id';
      } else if (currentRoute.startsWith('people.person')) {
        routeName = 'people.person';
        paramName = 'person_name';
      }
      if (routeName && paramName) {
        const queryParams = {
          sort: this.currentAlbum.sortAttribute,
          order: newOrder,
        };
        if (currentRoute.startsWith('people.person')) {
          queryParams.solo = this.router.currentRoute.queryParams.solo;
        }
        this.router.transitionTo(routeName, this.router.currentRoute.params[paramName], {
          queryParams,
        });
      }
    }
  }
}
