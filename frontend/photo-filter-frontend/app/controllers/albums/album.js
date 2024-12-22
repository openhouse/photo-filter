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

  // Pagination
  @tracked page = 1;
  pageSize = 50; // number of photos to show per page

  // The route model returns: { album, photos, ... }
  get allPhotos() {
    // If the model hasn’t fully loaded, return an empty array
    if (!this.model.isDataReady || !Array.isArray(this.model.photos)) {
      return [];
    }
    return this.model.photos;
  }

  /**
   * Return *all* photos after applying filtering and sorting,
   * but before pagination.
   */
  get filteredSortedPhotos() {
    let photos = this.allPhotos.slice();

    // 1. Filter by selected persons (if any)
    if (this.persons.length > 0) {
      photos = photos.filter((photo) => {
        // Each photo has an array of person model instances
        // with a `name` attribute
        const photoPersonNames = photo.persons.map((p) => p.name);
        // We want the photo to have *all* selected persons
        return this.persons.every((personName) =>
          photoPersonNames.includes(personName),
        );
      });
    }

    // 2. Sort by the current attribute and order
    photos.sort((a, b) => {
      const aValue = this.getNested(a, this.sort);
      const bValue = this.getNested(b, this.sort);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return this.order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return photos;
  }

  /**
   * Return only the photos that should appear
   * in the DOM on the current page.
   */
  get visiblePhotos() {
    // slice out the portion for current page
    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = this.page * this.pageSize;
    return this.filteredSortedPhotos.slice(startIndex, endIndex);
  }

  /**
   * Utility to handle nested paths like "score.overall".
   */
  getNested(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * Called when the user toggles a person’s name in the UI,
   * to either add or remove that person from the filter.
   */
  @action
  togglePerson(personName) {
    let selected = [...this.persons];
    if (selected.includes(personName)) {
      selected = selected.filter((p) => p !== personName);
    } else {
      selected.push(personName);
    }
    this.persons = selected;

    // Also reset pagination to page 1 whenever we change filters
    this.page = 1;

    // Update query params in the URL
    this.router.transitionTo(
      'albums.album',
      this.router.currentRoute.params.album_id,
      {
        queryParams: {
          sort: this.sort,
          order: this.order,
          persons: this.persons,
        },
      },
    );
  }

  /**
   * Load the next page (increment `page`).
   * If we’re at the last page, this does nothing.
   */
  @action
  loadMore() {
    // The total number of filtered photos (before pagination)
    const total = this.filteredSortedPhotos.length;

    // The index of the last item currently shown
    const lastShown = this.page * this.pageSize;

    if (lastShown < total) {
      // Another page still exists
      this.page++;
    }
  }

  /**
   * If the user changes the sort attribute in the UI,
   * reset page to 1 and update query params.
   */
  @action
  updateSortAttribute(event) {
    const newSort = event.target.value;
    this.sort = newSort;
    this.page = 1; // reset to first page
    this.router.transitionTo(
      'albums.album',
      this.router.currentRoute.params.album_id,
      {
        queryParams: {
          sort: newSort,
          order: this.order,
          persons: this.persons,
        },
      },
    );
  }

  /**
   * If the user changes the sort order in the UI,
   * reset page to 1 and update query params.
   */
  @action
  updateSortOrder(event) {
    const newOrder = event.target.value;
    this.order = newOrder;
    this.page = 1; // reset to first page
    this.router.transitionTo(
      'albums.album',
      this.router.currentRoute.params.album_id,
      {
        queryParams: {
          sort: this.sort,
          order: newOrder,
          persons: this.persons,
        },
      },
    );
  }
}
