import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AlbumsAlbumRoute extends Route {
  @service store;
  @service currentAlbum;

  queryParams = {
    sort: {},
    order: {},
    persons: {},
  };

  async model(params) {
    const {
      album_id,
      sort = 'score.overall',
      order = 'desc',
      persons = [],
    } = params;

    // Fetch the album record and await persons
    const album = await this.store.findRecord('album', album_id, {
      include: 'persons',
      reload: true,
    });

    const loadedPersons = await album.persons;
    let allPersons = loadedPersons.map((person) => person.name);

    // Fetch all photos once without sorting/filtering from the backend
    const allPhotos = await this.store.query('photo', {
      album_id,
    });

    // Determine score attributes
    let scoreAttributes = [];
    if (allPhotos.meta && allPhotos.meta.scoreAttributes) {
      scoreAttributes = allPhotos.meta.scoreAttributes;
    } else if (allPhotos.length > 0 && allPhotos.firstObject.score) {
      scoreAttributes = Object.keys(allPhotos.firstObject.score);
    }

    // Sort persons by how many times they appear
    const personCountMap = {};
    allPhotos.forEach((photo) => {
      photo.persons.forEach((p) => {
        personCountMap[p.name] = (personCountMap[p.name] || 0) + 1;
      });
    });

    allPersons = allPersons.sort((a, b) => {
      const countA = personCountMap[a] || 0;
      const countB = personCountMap[b] || 0;
      if (countB !== countA) return countB - countA;
      return a.localeCompare(b);
    });

    // Update currentAlbum service
    this.currentAlbum.isAlbumRoute = true;
    this.currentAlbum.albumTitle = album.title;
    this.currentAlbum.scoreAttributes = scoreAttributes;
    this.currentAlbum.sortAttribute = sort;
    this.currentAlbum.sortOrder = order;

    return {
      album,
      photos: allPhotos,
      albumUUID: allPhotos.meta?.albumUUID || album_id,
      sortAttribute: sort,
      sortOrder: order,
      scoreAttributes,
      persons: allPersons,
      selectedPersons: persons,
    };
  }

  resetController(controller, isExiting) {
    super.resetController(...arguments);
    if (isExiting) {
      // Reset currentAlbum service when leaving the album route
      this.currentAlbum.isAlbumRoute = false;
      this.currentAlbum.albumTitle = null;
      this.currentAlbum.scoreAttributes = [];
      this.currentAlbum.sortAttribute = 'score.overall';
      this.currentAlbum.sortOrder = 'desc';
    }
  }
}
