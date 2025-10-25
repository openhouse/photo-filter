// app/adapters/photo.js

import ApplicationAdapter from './application';

export default class PhotoAdapter extends ApplicationAdapter {
  buildURL(modelName, id, snapshot, requestType, query) {
    if (requestType === 'query' && query) {
      if (query.album_id) {
        const albumUUID = query.album_id;
        delete query.album_id;
        return `${this.host}/${this.namespace}/albums/${albumUUID}/photos`;
      }

      if (query.person_name) {
        const personName = encodeURIComponent(query.person_name);
        const params = [];
        if (query.sort) {
          params.push(`sort=${encodeURIComponent(query.sort)}`);
          delete query.sort;
        }
        if (query.order) {
          params.push(`order=${encodeURIComponent(query.order)}`);
          delete query.order;
        }
        if (query.solo !== undefined) {
          params.push(`solo=${query.solo}`);
          delete query.solo;
        }
        delete query.person_name;
        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        return `${this.host}/${this.namespace}/person/${personName}${queryString}`;
      }
    }

    return super.buildURL(modelName, id, snapshot, requestType, query);
  }
}
