import ApplicationAdapter from './application';

export default class PersonAdapter extends ApplicationAdapter {
  urlForQuery(query) {
    if (query?.scope === 'library') {
      const { scope, ...rest } = query;
      const host = this.host || '';
      const namespace = this.namespace ? `/${this.namespace}` : '';
      const base = `${host}${namespace}/library/people`;
      const queryString = this.buildQueryString(rest);
      return queryString ? `${base}?${queryString}` : base;
    }

    return super.urlForQuery(...arguments);
  }
}
