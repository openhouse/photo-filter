// frontend/photo-filter-frontend/app/controllers/application.js
import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

/**
 * Top‑level controller used by app/templates/application.hbs.
 *
 *  • Exposes a reactive `albums` getter so the template can iterate over it
 *    with {{#each this.albums as |album|}} …
 *  • Keeps the previously‑used `currentAlbum` and `reload` services
 *    available for reactive bindings already present in the template.
 */
export default class ApplicationController extends Controller {
  @service store; // Ember‑Data
  @service currentAlbum; // custom service – already exists in the project
  @service reload; // custom service – already exists in the project

  /** All albums currently loaded in the Ember‑Data store. */
  get albums() {
    // peekAll returns a live RecordArray – no async/await needed here
    return this.store.peekAll('album');
  }
}
