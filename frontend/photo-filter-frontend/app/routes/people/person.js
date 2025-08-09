import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import config from 'photo-filter-frontend/config/environment';

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

    const getNested = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    const primeCount = Math.min(60, photos.length);
    const fileSet = new Set();
    scoreAttributes.forEach((attr) => {
      const sorted = [...photos].sort((a, b) => {
        const aValue = getNested(a, attr);
        const bValue = getNested(b, attr);
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        return bValue - aValue;
      });
      sorted.slice(0, primeCount).forEach((p) => fileSet.add(p.exportedFilename));
    });
    try {
      fetch(`${config.APP.apiHost}/prime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: Array.from(fileSet) }),
      });
    } catch {
      /* no-op */
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
