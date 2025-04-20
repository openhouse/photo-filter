import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ProgressBarComponent extends Component {
  @action
  remove(el) {
    // auto‑remove after animation ends
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
}
