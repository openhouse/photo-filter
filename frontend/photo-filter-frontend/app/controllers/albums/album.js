// frontend/photo-filter-frontend/app/controllers/albums/album.js
import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class AlbumsAlbumController extends Controller {
  @service router;

  // No queryParams here; we rely on the route’s queryParams definition
  @tracked sort = 'score.overall';
  @tracked order = 'desc';
  @tracked persons = [];

  get filteredAndSortedPhotos() {
    console.log('[CONTROLLER] filteredAndSortedPhotos called');
    console.log('[CONTROLLER] current persons array:', this.persons);

    // Check if data is fully loaded
    if (!this.model.isDataReady) {
      console.log('[CONTROLLER] Data not ready yet, returning empty array');
      return [];
    }

    let photos = this.model.photos.slice(); // copy the array
    console.log('[CONTROLLER] starting with photos length:', photos.length);

    // Filter by selected persons if any
    if (this.persons.length > 0) {
      console.log('[CONTROLLER] filtering by persons:', this.persons);
      photos = photos.filter((photo) => {
        // Replace mapBy('name') with standard JS map:
        const photoPersonNames = photo.persons.map((p) => p.name);
        console.log('jb photoPersonNames', photoPersonNames);

        const allMatch = this.persons.every((personName) => {
          console.log('jb personName', personName);
          return photoPersonNames.includes(personName);
        });

        if (!allMatch) {
          console.log(
            '[CONTROLLER] photo excluded, missing one or more persons:',
            photo.exportedFilename || photo.originalName,
          );
        }
        return allMatch;
      });
    }

    console.log('[CONTROLLER] after filtering, photos length:', photos.length);

    // Sort by current sort and order
    const sortAttribute = this.sort;
    const order = this.order;
    console.log('[CONTROLLER] sorting by:', sortAttribute, order);

    photos.sort((a, b) => {
      const aValue = this.getNested(a, sortAttribute);
      const bValue = this.getNested(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    console.log('[CONTROLLER] final photos length:', photos.length);
    return photos;
  }

  getNested(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  @action
  togglePerson(personName) {
    console.log('[CONTROLLER] togglePerson called with:', personName);
    let selected = [...this.persons];
    if (selected.includes(personName)) {
      selected = selected.filter((p) => p !== personName);
      console.log('[CONTROLLER] Removed person, new selected:', selected);
    } else {
      selected.push(personName);
      console.log('[CONTROLLER] Added person, new selected:', selected);
    }
    this.persons = selected;

    // Update query param by transitioning with router service:
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
