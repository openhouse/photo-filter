// frontend/photo-filter-frontend/app/models/person.js
import Model, { attr, hasMany } from '@ember-data/model';

export default class PersonModel extends Model {
  @attr('string') name;
  @hasMany('photo', { async: true, inverse: 'persons' }) photos;
}
