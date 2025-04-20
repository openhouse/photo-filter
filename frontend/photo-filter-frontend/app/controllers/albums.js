import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import config from 'photo-filter-frontend/config/environment';

export default class AlbumsController extends Controller {
  @service reload;

  async refreshAlbum(id) {
    const r = await fetch(`${config.APP.apiHost}/api/albums/${id}/refresh`, {
      method: 'POST',
    });
    if (r.ok) {
      this.reload.clear(id);
    }
  }
}
