import Component from '@glimmer/component';
import { action } from '@ember/object';
import imageUrl from 'photo-filter-frontend/utils/image-url';

const MAX_WAIT = 60000; // 60s cap per image

export default class SmartImageComponent extends Component {
  get src() {
    return imageUrl(this.args.photo);
  }

  @action handleError(ev) {
    const img = ev.target;
    const url = img.src.split('?')[0];
    const started = parseInt(img.dataset.started || String(Date.now()), 10);
    if (!img.dataset.started) {
      img.dataset.started = String(started);
    }
    const elapsed = Date.now() - started;
    if (elapsed > MAX_WAIT) return;
    const attempt = parseInt(img.dataset.attempt || '0', 10);
    fetch(url, { method: 'HEAD' })
      .then((resp) => {
        let delay = parseInt(resp.headers.get('Retry-After') || '0', 10) * 1000;
        if (!delay) {
          delay = Math.min(30000, 2000 * 2 ** attempt);
        }
        setTimeout(() => {
          img.dataset.attempt = String(attempt + 1);
          img.src = `${url}?t=${Date.now()}`;
        }, delay);
      })
      .catch(() => {
        const delay = Math.min(30000, 2000 * 2 ** attempt);
        setTimeout(() => {
          img.dataset.attempt = String(attempt + 1);
          img.src = `${url}?t=${Date.now()}`;
        }, delay);
      });
  }
}
