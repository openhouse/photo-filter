import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class PeopleController extends Controller {
  queryParams = ['sort', 'order'];

  @tracked sort = 'medianPhotoAt';
  @tracked order = 'asc';

  sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'earliestPhotoAt', label: 'Earliest date' },
    { value: 'medianPhotoAt', label: 'Median date' },
    { value: 'latestPhotoAt', label: 'Most recent date' },
    { value: 'photoCount', label: 'Photo count' },
  ];

  get orderLabel() {
    if (this.sort === 'name') {
      return this.order === 'asc' ? 'A → Z' : 'Z → A';
    }

    if (this.sort === 'photoCount') {
      return this.order === 'asc'
        ? 'Fewest → Most photos'
        : 'Most → Fewest photos';
    }

    return this.order === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest';
  }

  @action
  toggleOrder() {
    this.order = this.order === 'asc' ? 'desc' : 'asc';
  }

  @action
  updateSort(event) {
    this.sort = event.target.value;
  }
}
