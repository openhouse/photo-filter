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
        console.log('[ROUTE] Serializing persons:', value);
        return JSON.stringify(value);
      },
      deserialize(value) {
        console.log('[ROUTE] Deserializing persons from URL:', value);
        if (typeof value === 'string') {
          try {
            const arr = JSON.parse(value);
            console.log('[ROUTE] Deserialized persons array:', arr);
            return arr;
          } catch (e) {
            console.warn(
              '[ROUTE] Failed to parse persons, returning empty array',
            );
            return [];
          }
        }
        return value || [];
      },
    },
  };

  async model(params) {
    console.log('[ROUTE] model hook params:', params);

    const {
      album_id,
      sort = 'score.overall',
      order = 'desc',
      persons = [],
    } = params;

    console.log('[ROUTE] Using sort:', sort);
    console.log('[ROUTE] Using order:', order);
    console.log('[ROUTE] Using persons:', persons);

    // Fetch the album record and persons in one go (async: false means all included data is ready)
    const album = await this.store.findRecord('album', album_id, {
      include: 'persons', // This ensures persons are included in the album payload
      reload: true,
    });

    const loadedPersons = album.persons;
    const allPersons = loadedPersons.map((person) => person.name);
    console.log('[ROUTE] All persons in album:', allPersons);

    // Fetch all photos once, including included persons
    const allPhotos = await this.store.query('photo', {
      album_id,
    });
    console.log('[ROUTE] allPhotos length:', allPhotos.length);

    // Since async: false is set on photo.persons and album.persons, we have all data now.
    // No need to reload anything. The included payload gave us all persons upfront.

    // Determine score attributes
    let scoreAttributes = [];
    if (allPhotos.meta && allPhotos.meta.scoreAttributes) {
      scoreAttributes = allPhotos.meta.scoreAttributes;
    } else if (allPhotos.length > 0 && allPhotos.firstObject.score) {
      scoreAttributes = Object.keys(allPhotos.firstObject.score);
    }

    console.log('[ROUTE] scoreAttributes:', scoreAttributes);

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

    console.log('[ROUTE] Sorted all persons by frequency:', sortedAllPersons);

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
