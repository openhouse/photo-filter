import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class PeopleController extends Controller {
  queryParams = ['sort', 'order'];

  @tracked sort = 'medianPhotoAt';
  @tracked order = 'asc';

  @action
  toggleOrder() {
    this.order = this.order === 'asc' ? 'desc' : 'asc';
  }

  @action
  sortBy(field) {
    this.sort = field;
  }
}
