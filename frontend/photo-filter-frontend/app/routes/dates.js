// app/routes/dates.js
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import fetch from 'fetch';

/**
 * The top-level /dates route fetches the summary from /api/dates,
 * so we can build the collapsible nav. This route *does not* fetch actual photos.
 */
export default class DatesRoute extends Route {
  @service store;

  async model() {
    // fetch the year→month→day summary from the backend
    const response = await fetch('http://localhost:3000/api/dates');
    const json = await response.json();
    return json.data; // e.g. { "2024": {count:..., months:{...}}, ... }
  }
}
