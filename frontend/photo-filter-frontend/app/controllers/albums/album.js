import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class AlbumsAlbumController extends Controller {
  @service router;

  @tracked sort = 'score.overall';
  @tracked order = 'desc';
  @tracked persons = [];

  get filteredAndSortedPhotos() {
    if (!this.model.isDataReady) {
      return [];
    }

    let photos = this.model.photos.slice();

    // Filter by selected persons if any
    if (this.persons.length > 0) {
      photos = photos.filter((photo) => {
        const photoPersonNames = photo.persons.map((p) => p.name);
        return this.persons.every((personName) =>
          photoPersonNames.includes(personName),
        );
      });
    }

    // Sort by current sort and order
    const sortAttribute = this.sort;
    const order = this.order;

    photos.sort((a, b) => {
      const aValue = this.getNested(a, sortAttribute);
      const bValue = this.getNested(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return photos;
  }

  getNested(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
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
}
