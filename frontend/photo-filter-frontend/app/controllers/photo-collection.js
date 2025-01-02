// app/controllers/photo-collection.js
import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * A reusable base controller for any "collection of photos" route.
 * It handles:
 *  - sorting (sort=score.overall or whatever)
 *  - ordering (asc/desc)
 *  - person filtering
 *  - pagination
 *
 * Subclasses must:
 *  1) Provide a `this.model.photos` array in route model
 *  2) Provide `this.model.persons` (if you want person toggles)
 *  3) Implement `_updateRouteQueryParams(params)` to call router.transitionTo
 */
export default class PhotoCollectionController extends Controller {
  // QueryParam-like states:
  @tracked sort = 'score.overall';
  @tracked order = 'desc';
  @tracked persons = [];

  @tracked page = 1;
  pageSize = 50;

  get allPhotos() {
    // model should have: { photos, isDataReady, persons, scoreAttributes }
    if (!this.model?.isDataReady || !Array.isArray(this.model.photos)) {
      return [];
    }
    return this.model.photos;
  }

  get filteredSortedPhotos() {
    let photos = this.allPhotos.slice();

    // Person filtering
    if (this.persons.length > 0) {
      photos = photos.filter((photo) => {
        // photo.persons is an array of either strings or {name: string}
        const names = photo.persons.map((p) => p.name ?? p);
        return this.persons.every((selectedName) =>
          names.includes(selectedName),
        );
      });
    }

    // Sorting
    photos.sort((a, b) => {
      const aVal = this.getNested(a, this.sort);
      const bVal = this.getNested(b, this.sort);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return this.order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return photos;
  }

  get visiblePhotos() {
    const start = (this.page - 1) * this.pageSize;
    const end = this.page * this.pageSize;
    return this.filteredSortedPhotos.slice(start, end);
  }

  getNested(obj, path) {
    if (!obj || !path) return null;
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

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

    this._updateRouteQueryParams({
      sort: this.sort,
      order: this.order,
      persons: this.persons,
    });
  }

  @action
  updateSortAttribute(event) {
    this.sort = event.target.value;
    this.page = 1;

    this._updateRouteQueryParams({
      sort: this.sort,
      order: this.order,
      persons: this.persons,
    });
  }

  @action
  updateSortOrder(event) {
    this.order = event.target.value;
    this.page = 1;

    this._updateRouteQueryParams({
      sort: this.sort,
      order: this.order,
      persons: this.persons,
    });
  }

  @action
  loadMore() {
    if (this.visiblePhotos.length < this.filteredSortedPhotos.length) {
      this.page++;
    }
  }

  /**
   * Subclasses implement how to do the route transition.
   * E.g. in albums, we do:
   *   this.router.transitionTo('albums.album', albumId, { queryParams: {...} });
   * In dates, we do:
   *   this.router.transitionTo('dates.year', year, { queryParams: {...} });
   */
  _updateRouteQueryParams(_params) {
    // no-op by default
  }
}
