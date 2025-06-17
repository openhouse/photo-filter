// app/components/photo-tile.js
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import config from 'photo-filter-frontend/config/environment';

export default class PhotoTileComponent extends Component {
  @service router;

  get apiHost() {
    return config.APP.apiHost || 'http://localhost:3000';
  }

  get mediaSrc() {
    const { albumUUID, photo } = this.args;
    return `${this.apiHost}/images/${albumUUID}/${photo.exportedFilename}`;
  }
}
