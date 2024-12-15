// frontend/photo-filter-frontend/app/routes/albums/album.js
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AlbumsAlbumRoute extends Route {
  @service store;
  @service currentAlbum;

  queryParams = {
    sort: {},
    order: {},
    persons: {
      // Custom serialize/deserialize so persons is always an array
      serialize(value) {
        return JSON.stringify(value);
      },
      deserialize(value) {
        if (typeof value === 'string') {
          try {
            const arr = JSON.parse(value);
            return arr;
          } catch (e) {
            return [];
          }
        }
        return value || [];
      },
    },
  };

  async model(params) {
    const {
      album_id,
      sort = 'score.overall',
      order = 'desc',
      persons = [],
    } = params;

    // Fetch the album record and persons in one go (async: false means all included data is ready)
    const album = await this.store.findRecord('album', album_id, {
      include: 'persons', // This ensures persons are included in the album payload
      reload: true,
    });

    const loadedPersons = album.persons;
    const allPersons = loadedPersons.map((person) => person.name);

    // Fetch all photos once, including included persons
    const allPhotos = await this.store.query('photo', {
      album_id,
    });

    // Since async: false is set on photo.persons and album.persons, we have all data now.
    // No need to reload anything. The included payload gave us all persons upfront.

    // Determine score attributes
    let scoreAttributes = [];
    if (allPhotos.meta && allPhotos.meta.scoreAttributes) {
      scoreAttributes = allPhotos.meta.scoreAttributes;
    } else if (allPhotos.length > 0 && allPhotos.firstObject.score) {
      scoreAttributes = Object.keys(allPhotos.firstObject.score);
    }

    // Sort persons by how many times they appear in the photos
    const personCountMap = {};
    allPhotos.forEach((photo) => {
      // photo.persons is already resolved since async: false
      photo.persons.forEach((p) => {
        personCountMap[p.name] = (personCountMap[p.name] || 0) + 1;
      });
    });

    const sortedAllPersons = allPersons.sort((a, b) => {
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

    // Data is fully ready, no reload needed
    const isDataReady = true;

    return {
      album,
      photos: allPhotos,
      albumUUID: allPhotos.meta?.albumUUID || album_id,
      sortAttribute: sort,
      sortOrder: order,
      scoreAttributes,
      persons: sortedAllPersons,
      selectedPersons: persons,
      isDataReady,
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
