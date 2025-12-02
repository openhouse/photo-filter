import ApplicationAdapter from './application';

export default class PersonAdapter extends ApplicationAdapter {
  urlForQuery(query, modelName) {
    if (query?.scope === 'library') {
      delete query.scope;

      const host = this.host || '';
      const namespace = this.namespace ? `/${this.namespace}` : '';

      return `${host}${namespace}/library/people`;
    }

    return super.urlForQuery(query, modelName);
  }
}
