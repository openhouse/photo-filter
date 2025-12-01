import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class PeopleRoute extends Route {
  @service store;

  queryParams = {
    sort: { refreshModel: true },
    order: { refreshModel: true },
  };

  async model(params) {
    const sort = params.sort ?? 'medianPhotoAt';
    const order = params.order ?? 'asc';

    return this.store.query('person', {
      scope: 'library',
      sort,
      order,
    });
  }
}
