// frontend/photo-filter-frontend/app/routes/albums/album.js

import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AlbumsAlbumRoute extends Route {
  @service store;
  @service currentAlbum;

  // We add `dates` to the recognized queryParams
  queryParams = {
    sort: {},
    order: {},
    persons: {
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
    dates: {
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
  };

  async model(params) {
    const {
      album_id,
      sort = 'score.overall',
      order = 'desc',
      persons = [],
      dates = [],
    } = params;

    const album = await this.store.findRecord('album', album_id, {
      include: 'persons',
      reload: true,
    });

    const loadedPersons = album.persons;
    const allPersons = loadedPersons.map((p) => p.name);

    const allPhotos = await this.store.query('photo', { album_id });

    let scoreAttributes = [];
    if (allPhotos.meta?.scoreAttributes) {
      scoreAttributes = allPhotos.meta.scoreAttributes;
    } else if (allPhotos.length > 0 && allPhotos.firstObject.score) {
      scoreAttributes = Object.keys(allPhotos.firstObject.score);
    }

    // Sort persons by frequency
    const personCountMap = {};
    allPhotos.forEach((photo) => {
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

    this.currentAlbum.isAlbumRoute = true;
    this.currentAlbum.albumTitle = album.title;
    this.currentAlbum.scoreAttributes = scoreAttributes;
    this.currentAlbum.sortAttribute = sort;
    this.currentAlbum.sortOrder = order;

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
      selectedDates: dates,
      isDataReady,
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
