import JSONAPIAdapter from '@ember-data/adapter/json-api';
import ENV from 'photo-filter-frontend/config/environment';

export default class ApplicationAdapter extends JSONAPIAdapter {
  host = ENV.backendHost;
  namespace = 'api';
}
