// frontend/photo-filter-frontend/app/controllers/albums/album.js

import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class AlbumsAlbumController extends Controller {
  @service router;

  // Sorting & Filtering
  @tracked sort = 'score.overall';
  @tracked order = 'desc';
  @tracked persons = [];
  @tracked dates = [];

  // Pagination
  @tracked page = 1;
  pageSize = 50;

  get allPhotos() {
    if (!this.model.isDataReady || !Array.isArray(this.model.photos)) {
      return [];
    }
    return this.model.photos;
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
}
