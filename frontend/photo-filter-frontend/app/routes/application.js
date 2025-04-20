import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service store;

  async model() {
    // Fetch all albums so we can display them in the universal sidebar
    return this.store.findAll('album');
  }
}
