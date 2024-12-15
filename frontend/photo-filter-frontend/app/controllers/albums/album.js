import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class AlbumsAlbumController extends Controller {
  queryParams = ['sort', 'order', 'persons'];

  @tracked sort = 'score.overall';
  @tracked order = 'desc';
  @tracked persons = [];

  // The route provides `photos` unfiltered. We apply filtering and sorting in memory.
  get filteredAndSortedPhotos() {
    let photos = this.model.photos.slice(); // copy array

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
  }
}
