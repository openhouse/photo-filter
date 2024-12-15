import JSONAPIAdapter from '@ember-data/adapter/json-api';
import config from 'photo-filter-frontend/config/environment';

export default class ApplicationAdapter extends JSONAPIAdapter {
  host = config.APP.apiHost || 'http://localhost:3000';
  namespace = 'api';
}
