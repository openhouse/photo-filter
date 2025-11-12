// frontend/photo-filter-frontend/app/controllers/albums/album.js

import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import config from 'photo-filter-frontend/config/environment';

export default class AlbumsAlbumController extends Controller {
  @service router;
  @service albumPrep;

  @tracked albumUUID = null;
  @tracked photos = [];
  @tracked availablePersons = [];

  // Sorting & Filtering
  @tracked sort = 'score.overall';
  @tracked order = 'desc';
  @tracked persons = [];
  @tracked dates = [];

  // Export Top-N
  @tracked exportN = 5;

  // Export status tracking
  @tracked exportStatus = null;
  #statusTimer = null;
  #statusAlbumUUID = null;

  // Pagination
  @tracked page = 1;
  pageSize = 50;

  initializeFromModel(model) {
    this.albumUUID = model?.albumUUID ?? null;
    this.photos = Array.isArray(model?.photos) ? model.photos : [];
    this.availablePersons = Array.isArray(model?.persons) ? model.persons : [];
    this.exportStatus = model?.exportStatus ?? null;
    this.sort = model?.sortAttribute ?? this.sort;
    this.order = model?.sortOrder ?? this.order;
    this.persons = Array.isArray(model?.selectedPersons)
      ? [...model.selectedPersons]
      : [];
    this.dates = Array.isArray(model?.selectedDates)
      ? [...model.selectedDates]
      : [];
    this.page = 1;
  }

  applyPreparedData({ exportStatus, photos, persons } = {}) {
    if (exportStatus) {
      this.exportStatus = exportStatus;
    }
    if (Array.isArray(photos)) {
      this.photos = Array.from(photos);
    }
    if (Array.isArray(persons)) {
      this.availablePersons = persons;
    }
    if (this.isExportReady) {
      this.page = 1;
    }
  }

  get isExportReady() {
    return this.exportStatus?.status === 'ready';
  }

  get isExportRunning() {
    return this.exportStatus?.status === 'running';
  }

  get isExportSkippedEmpty() {
    return this.exportStatus?.status === 'skipped-empty';
  }

  get isExportStuck() {
    return this.exportStatus?.status === 'stuck';
  }

  get workerStartCommand() {
    return 'npm run dev';
  }

  get exportStatusMessage() {
    if (!this.exportStatus) {
      return 'Preparing album…';
    }
    const status = this.exportStatus.status;
    switch (status) {
      case 'ready':
        return 'Album is ready.';
      case 'skipped-empty':
        return 'No exportable photos were found in this album.';
      case 'error':
        return this.exportStatus.errorMessage || 'Album export failed.';
      case 'stuck':
        return 'Background worker is not running.';
      case 'pending':
        if (!this.exportStatus.startedAt) {
          return 'Initializing export…';
        }
        return this.#preparingMessage();
      case 'running':
      default:
        return this.#preparingMessage();
    }
  }

  get allPhotos() {
    if (!this.isExportReady || !Array.isArray(this.photos)) {
      return [];
    }
    return this.photos;
  }

  /**
   * Return *all* photos after applying date filtering, person filtering, and sorting,
   * but before pagination.
   */
  get filteredSortedPhotos() {
    let photos = this.allPhotos.slice();

    // 1. Date-based filtering if `dates` is non-empty
    if (this.dates.length > 0) {
      photos = photos.filter((photo) => this.matchesAnySelectedDate(photo));
    }

    // 2. Person-based filtering
    if (this.persons.length > 0) {
      photos = photos.filter((photo) => {
        let photoPersonNames = photo.persons.map((p) => p.name);
        return this.persons.every((personName) =>
          photoPersonNames.includes(personName),
        );
      });
    }

    // 3. Sort by attribute
    photos.sort((a, b) => {
      const aValue = this.getNested(a, this.sort);
      const bValue = this.getNested(b, this.sort);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return this.order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return photos;
  }

  get visiblePhotos() {
    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = this.page * this.pageSize;
    return this.filteredSortedPhotos.slice(startIndex, endIndex);
  }

  /**
   * Parse the photo's date to see if it matches any of the selected date-keys:
   *   - "YYYY"
   *   - "YYYY-MM"
   *   - "YYYY-MM-DD"
   */
  matchesAnySelectedDate(photo) {
    if (!photo.exifInfo && !photo.score) {
      return false; // minimal fallback
    }
    let dateStr = photo.date; // e.g. "2024-12-07 15:30:00-05:00"
    let dObj = new Date(dateStr);
    if (isNaN(dObj.getTime())) {
      return false;
    }
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');

    // e.g. "2024", "2024-12", "2024-12-07"
    const yearKey = `${y}`;
    const yearMonthKey = `${y}-${m}`;
    const fullDayKey = `${y}-${m}-${d}`;

    // If ANY of these matches is in this.dates, we pass
    if (this.dates.includes(yearKey)) {
      return true;
    }
    if (this.dates.includes(yearMonthKey)) {
      return true;
    }
    if (this.dates.includes(fullDayKey)) {
      return true;
    }
    return false;
  }

  getNested(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  // Person toggles, etc. remain the same
  @action
  togglePerson(personName) {
    let selected = [...this.persons];
    if (selected.includes(personName)) {
      selected = selected.filter((p) => p !== personName);
    } else {
      selected.push(personName);
    }
    this.persons = selected;
    this.page = 1;

    this.updateQueryParams();
  }

  @action
  updateSortAttribute(event) {
    this.sort = event.target.value;
    this.page = 1;
    this.updateQueryParams();
  }

  @action
  updateSortOrder(event) {
    this.order = event.target.value;
    this.page = 1;
    this.updateQueryParams();
  }

  @action
  updateExportN(event) {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0) {
      this.exportN = value;
    }
  }

  @action
  async exportTopN() {
    const albumId = this.router.currentRoute.params.album_id;
    const apiHost = config.APP.apiHost;
    const body = {
      n: this.exportN,
      persons: this.persons,
    };

    await fetch(`${apiHost}/api/albums/${albumId}/export-top-n`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    this.startStatusWatcher(albumId);
  }

  @action
  async exportAll() {
    const albumId = this.router.currentRoute.params.album_id;
    const apiHost = config.APP.apiHost;
    const body = {
      persons: this.persons,
    };

    await fetch(`${apiHost}/api/albums/${albumId}/export-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    this.startStatusWatcher(albumId);
  }

  startStatusWatcher(albumUUID, initialStatus = null) {
    this.albumUUID = albumUUID;
    this.#statusAlbumUUID = albumUUID;
    this.stopStatusWatcher();
    this.exportStatus = initialStatus || null;
    this.fetchStatus();
  }

  stopStatusWatcher() {
    if (this.#statusTimer) {
      const clearFn =
        typeof globalThis.clearTimeout === 'function'
          ? globalThis.clearTimeout
          : null;
      if (clearFn) {
        clearFn(this.#statusTimer);
      }
      this.#statusTimer = null;
    }
  }

  async fetchStatus() {
    if (!this.#statusAlbumUUID) {
      return;
    }

    try {
      const json = await this.albumPrep.fetchStatus(this.#statusAlbumUUID);
      this.exportStatus = json;
    } catch (error) {
      this.exportStatus = {
        status: 'error',
        errorMessage: error.message,
      };
    }

    if (!this.isExportReady && this.exportStatus?.status !== 'error') {
      const setFn =
        typeof globalThis.setTimeout === 'function'
          ? globalThis.setTimeout
          : null;
      if (setFn) {
        this.#statusTimer = setFn(() => this.fetchStatus(), 2000);
      }
    }
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.stopStatusWatcher();
  }

  updateQueryParams() {
    let currentRoute = this.router.currentRouteName;
    let albumId = this.router.currentRoute.params.album_id;
    let queryParams = {
      sort: this.sort,
      order: this.order,
      persons: this.persons,
      dates: this.dates,
    };

    this.router.transitionTo(currentRoute, albumId, { queryParams });
  }

  get lastProgressLabel() {
    return this.#lastProgressLabel();
  }

  #lastProgressLabel() {
    const timestamps = [
      this.exportStatus?.lastHeartbeatAt,
      this.exportStatus?.lastProgressAt,
      this.exportStatus?.finishedAt,
      this.exportStatus?.startedAt,
    ].filter(Boolean);
    if (timestamps.length === 0) {
      return null;
    }
    const mostRecent = timestamps
      .map((iso) => ({ iso, value: Date.parse(iso) }))
      .filter((entry) => Number.isFinite(entry.value))
      .sort((a, b) => b.value - a.value)[0];
    if (!mostRecent) {
      return null;
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(mostRecent.value));
    } catch {
      return new Date(mostRecent.value).toLocaleString();
    }
  }

  #preparingMessage() {
    const last = this.#lastProgressLabel();
    return last
      ? `Preparing album… (last progress ${last})`
      : 'Preparing album…';
  }
}
