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

  /**
   * Check if album is stale, to safely avoid
   * calling staleAlbums.has(...) in the template.
   */
  isStale(albumId) {
    // Optional chaining ensures we won't crash if reload or staleAlbums is undefined
    return this.reload?.staleAlbums?.has?.(albumId) ?? false;
  }
}
