import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PeoplePersonController extends Controller {
  @service currentAlbum;
  queryParams = ['solo'];
  @tracked solo = false;

  @action
  toggleSolo() {
    this.solo = !this.solo;
  }
}
