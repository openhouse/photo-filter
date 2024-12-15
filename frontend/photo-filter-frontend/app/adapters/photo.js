// app/adapters/photo.js

import ApplicationAdapter from './application';

export default class PhotoAdapter extends ApplicationAdapter {
  buildURL(modelName, id, snapshot, requestType, query) {
    // Handle the query for photos by album ID
    if (requestType === 'query' && query && query.album_id) {
      const albumUUID = query.album_id;
      const url = `${this.host}/${this.namespace}/albums/${albumUUID}/photos`;

      // Remove album_id from query params to avoid duplication
      delete query.album_id;

      return url;
    } else {
      return super.buildURL(...arguments);
    }
  }
}
