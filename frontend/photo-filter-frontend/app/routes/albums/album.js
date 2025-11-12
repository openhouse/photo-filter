// frontend/photo-filter-frontend/app/routes/albums/album.js

import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

const DATA_READY_STATUSES = new Set(['ready', 'skipped-empty']);

export default class AlbumsAlbumRoute extends Route {
  @service store;
  @service currentAlbum;
  @service albumPrep;

  #ensureTask = null;
  #controllerUpdater = null;

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

    const albumUUID = album.id ?? album.uuid ?? album_id;
    const initialStatus = await this.albumPrep.fetchStatus(albumUUID);

    let photos = [];
    let scoreAttributes = [];
    let personsList = (album.persons || []).map((p) => p.name).filter(Boolean);
    let resolvedStatus = initialStatus;

    if (DATA_READY_STATUSES.has(initialStatus?.status)) {
      const photosCollection = await this.store.query('photo', { album_id });
      const transformed = this.#transformPhotos(
        album,
        photosCollection,
        initialStatus,
      );
      photos = transformed.photos;
      scoreAttributes = transformed.scoreAttributes;
      personsList = transformed.personsList;
      resolvedStatus = transformed.exportStatus;
    }

    this.currentAlbum.isAlbumRoute = true;
    this.currentAlbum.albumTitle = album.title;
    this.currentAlbum.scoreAttributes = scoreAttributes;
    this.currentAlbum.sortAttribute = sort;
    this.currentAlbum.sortOrder = order;

    return {
      album,
      albumUUID,
      photos,
      scoreAttributes,
      persons: personsList,
      selectedPersons: Array.isArray(persons) ? persons : [],
      selectedDates: Array.isArray(dates) ? dates : [],
      sortAttribute: sort,
      sortOrder: order,
      exportStatus: resolvedStatus,
      isDataReady: DATA_READY_STATUSES.has(resolvedStatus?.status),
    };
  }

  afterModel(model) {
    super.afterModel?.(...arguments);
    if (model?.albumUUID) {
      this.#startEnsureTask(model);
    }
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.initializeFromModel?.(model);
    if (model?.albumUUID) {
      controller.startStatusWatcher(model.albumUUID, model.exportStatus);
    }
    this.#controllerUpdater = (payload) =>
      controller.applyPreparedData?.(payload);
  }

  resetController(controller, isExiting) {
    super.resetController(...arguments);
    if (isExiting) {
      this.currentAlbum.isAlbumRoute = false;
      this.currentAlbum.albumTitle = null;
      this.currentAlbum.scoreAttributes = [];
      this.currentAlbum.sortAttribute = 'score.overall';
      this.currentAlbum.sortOrder = 'desc';
      this.albumPrep.ensurePrepared.cancelAll();
      this.#ensureTask?.cancel?.();
      this.#ensureTask = null;
      this.#controllerUpdater = null;
    }
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.#ensureTask?.cancel?.();
    this.#ensureTask = null;
    this.#controllerUpdater = null;
  }

  #startEnsureTask(model) {
    this.#ensureTask?.cancel?.();
    const task = this.albumPrep.ensurePrepared.perform(model.albumUUID);
    this.#ensureTask = task;
    task
      .then((status) => {
        if (!status || this.isDestroying || this.isDestroyed) {
          return;
        }
        if (DATA_READY_STATUSES.has(status.status)) {
          return this.#loadPreparedData(model, status);
        }
        this.#notifyController(model, status);
      })
      .catch((error) => {
        console.error(
          `[albums.album] ensurePrepared failed for ${model.albumUUID}`,
          error,
        );
      });
  }

  async #loadPreparedData(model, status) {
    try {
      const albumId = model.album?.id ?? model.albumUUID;
      const photosCollection = await this.store.query('photo', {
        album_id: albumId,
      });
      const transformed = this.#transformPhotos(
        model.album,
        photosCollection,
        status,
      );
      model.photos = transformed.photos;
      model.scoreAttributes = transformed.scoreAttributes;
      model.persons = transformed.personsList;
      model.exportStatus = transformed.exportStatus;
      model.isDataReady = true;
      this.currentAlbum.scoreAttributes = transformed.scoreAttributes;
      this.#notifyController(model, transformed.exportStatus, transformed);
    } catch (error) {
      console.error(
        `[albums.album] failed to load photos for ${model.albumUUID}`,
        error,
      );
      this.#notifyController(model, status);
    }
  }

  #notifyController(model, exportStatus, transformed) {
    if (typeof this.#controllerUpdater !== 'function') {
      return;
    }
    this.#controllerUpdater({
      exportStatus,
      photos: transformed?.photos ?? model.photos,
      persons: transformed?.personsList ?? model.persons,
    });
  }

  #transformPhotos(album, photosCollection, fallbackStatus) {
    const photosArray = Array.from(photosCollection ?? []);
    const meta = photosCollection?.meta ?? {};
    const exportStatus = meta.exportStatus || fallbackStatus;

    let scoreAttributes = [];
    if (
      Array.isArray(meta.scoreAttributes) &&
      meta.scoreAttributes.length > 0
    ) {
      scoreAttributes = meta.scoreAttributes;
    } else if (photosArray.length > 0 && photosArray[0].score) {
      scoreAttributes = Object.keys(photosArray[0].score);
    }

    const loadedPersons = album?.persons || [];
    const allPersons = loadedPersons.map((p) => p.name).filter(Boolean);
    const personCountMap = {};
    photosArray.forEach((photo) => {
      const people = Array.isArray(photo.persons) ? photo.persons : [];
      people.forEach((person) => {
        const name = typeof person === 'string' ? person : person?.name;
        if (!name) {
          return;
        }
        personCountMap[name] = (personCountMap[name] || 0) + 1;
      });
    });
    const personsList = allPersons.sort((a, b) => {
      const countA = personCountMap[a] || 0;
      const countB = personCountMap[b] || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return a.localeCompare(b);
    });

    return {
      photos: photosArray,
      personsList,
      scoreAttributes,
      exportStatus,
    };
  }
}
