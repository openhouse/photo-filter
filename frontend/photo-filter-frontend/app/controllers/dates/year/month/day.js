// app/controllers/dates/year/month/day.js
import { inject as service } from '@ember/service';
import PhotoCollectionController from 'photo-filter-frontend/controllers/photo-collection';

export default class DatesYearMonthDayController extends PhotoCollectionController {
  @service router;

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

  /**
   * Called whenever we change sorting or person filters. We then re-transition
   * to the same route, with updated query params in the URL.
   */
  _updateRouteQueryParams(params) {
    const { year, month, day } = this.router.currentRoute.params;
    this.router.transitionTo('dates.year.month.day', year, month, day, {
      queryParams: params,
    });
  }
}
