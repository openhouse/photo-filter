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

  displayNameFor(person) {
    return person.displayName || person.name || 'Unnamed person';
  }

  // Backend typically supplies a sort-aware heroExportedName; this helper keeps
  // tests and older index files working by falling back to per-mode filenames.
  heroFilenameFor(person) {
    if (person.heroExportedName) {
      return person.heroExportedName;
    }

    if (this.sort === 'earliestPhotoAt') {
      return person.earliestExportedName || person.heroExportedName;
    }

    if (this.sort === 'latestPhotoAt') {
      return person.latestExportedName || person.heroExportedName;
    }

    if (this.sort === 'photoCount' || this.sort === 'name') {
      return person.highlightExportedName || person.heroExportedName;
    }

    return person.medianExportedName || person.heroExportedName;
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
