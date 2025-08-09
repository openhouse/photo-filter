import Service from '@ember/service';
import config from 'photo-filter-frontend/config/environment';

export default class ImageBusService extends Service {
  constructor() {
    super(...arguments);
    const host = config.APP.apiHost || '';
    const es = new EventSource(`${host}/api/stream`);
    es.addEventListener('image-ready', (event) => {
      try {
        const data = JSON.parse(event.data);
        const selector = `img[data-exported-filename="${data.exportedFilename}"]`;
        document.querySelectorAll(selector).forEach((img) => {
          const url = img.src.split('?')[0];
          img.dataset.attempt = '0';
          img.dataset.started = String(Date.now());
          img.src = `${url}?t=${Date.now()}`;
        });
      } catch {
        // ignore parse errors
      }
    });
    this.source = es;
  }
}

