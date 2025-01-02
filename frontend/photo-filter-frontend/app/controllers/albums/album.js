// app/controllers/albums/album.js

import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { A } from '@ember/array'; // for array handling if needed

export default class AlbumsAlbumController extends Controller {
  @service router;

  // Query params
  queryParams = [
    'sort',
    'order',
    {
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
    },
  ];

  // Tracked properties for sort/order/persons
  @tracked sort = 'score.overall';
  @tracked order = 'desc';
  @tracked persons = A([]);

  page = 1;
  pageSize = 50;

  get allPhotos() {
    const photos = this.model?.photos || [];
    return photos;
  }

  get filteredSortedPhotos() {
    // Person filtering
    let results = this.allPhotos.slice();
    if (this.persons.length > 0) {
      results = results.filter((photo) => {
        const names = photo.persons.map((p) => p.name ?? p);
        return this.persons.every((selectedName) =>
          names.includes(selectedName),
        );
      });
    }
    // Sorting
    results.sort((a, b) => {
      const aVal = this._getNested(a, this.sort);
      const bVal = this._getNested(b, this.sort);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return this.order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return results;
  }

  get visiblePhotos() {
    const start = (this.page - 1) * this.pageSize;
    const end = this.page * this.pageSize;
    return this.filteredSortedPhotos.slice(start, end);
  }

  // Classic actions hash:
  actions = {
    togglePerson(personName) {
      let selected = this.persons.slice();
      if (selected.includes(personName)) {
        selected = selected.filter((p) => p !== personName);
      } else {
        selected.push(personName);
      }
      this.persons = A(selected);
      this.page = 1;
      this._updateRouteQueryParams();
    },

    updateSortAttribute(event) {
      this.sort = event.target.value;
      this.page = 1;
      this._updateRouteQueryParams();
    },

    updateSortOrder(event) {
      this.order = event.target.value;
      this.page = 1;
      this._updateRouteQueryParams();
    },
  };

  // Let’s keep the route transition logic separate
  _updateRouteQueryParams() {
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

  _getNested(obj, path) {
    if (!obj || !path) return null;
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }
}
