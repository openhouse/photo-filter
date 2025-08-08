import Component from '@glimmer/component';
import { action } from '@ember/object';
import imageUrl from 'photo-filter-frontend/utils/image-url';

export default class PhotoImgComponent extends Component {
  get src() {
    return imageUrl(this.args.photo);
  }

  @action retryOnce(ev) {
    const img = ev.target;
    if (!img.dataset._retried) {
      img.dataset._retried = '1';
      setTimeout(() => (img.src = this.src), 800);
    }
  }
}
