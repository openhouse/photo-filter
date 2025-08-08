import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class PeoplePersonRoute extends Route {
  @service store;
  @service currentAlbum;

  queryParams = {
    sort: {},
    order: {},
    solo: {},
  };

  async model(params) {
    const {
      person_name,
      sort = 'score.overall',
      order = 'desc',
      solo = false,
    } = params;

    const photos = await this.store.query('photo', {
      person_name,
      sort,
      order,
      solo,
    });

    let scoreAttributes = [];
    if (photos.meta?.scoreAttributes) {
      scoreAttributes = photos.meta.scoreAttributes;
    } else if (photos.length > 0 && photos.firstObject.score) {
      scoreAttributes = Object.keys(photos.firstObject.score);
    }

    this.currentAlbum.isAlbumRoute = true;
    this.currentAlbum.albumTitle = person_name;
    this.currentAlbum.scoreAttributes = scoreAttributes;
    this.currentAlbum.sortAttribute = sort;
    this.currentAlbum.sortOrder = order;

    return {
      personName: person_name,
      photos,
      sortAttribute: sort,
      sortOrder: order,
      scoreAttributes,
      solo,
    };
  }

  resetController(controller, isExiting) {
    super.resetController(...arguments);
    if (isExiting) {
      this.currentAlbum.isAlbumRoute = false;
      this.currentAlbum.albumTitle = null;
      this.currentAlbum.scoreAttributes = [];
      this.currentAlbum.sortAttribute = 'score.overall';
      this.currentAlbum.sortOrder = 'desc';
    }
  }
}
