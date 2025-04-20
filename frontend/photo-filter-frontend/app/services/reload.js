import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import config from 'photo-filter-frontend/config/environment';

export default class ReloadService extends Service {
  @tracked staleAlbums = new Set();

  constructor() {
    super();
    this.#poll();
    this.timer = setInterval(() => this.#poll(), 60000);
  }

  willDestroy() {
    clearInterval(this.timer);
  }

  async #poll() {
    try {
      const r = await fetch(`${config.APP.apiHost}/api/library/status`);
      const j = await r.json();
      this.staleAlbums = new Set(j.staleAlbums || []);
    } catch (_e) {
      /* network failure → keep previous state */
    }
  }

  clear(id) {
    if (this.staleAlbums.delete(id)) {
      this.staleAlbums = new Set(this.staleAlbums);
    }
  }
}
