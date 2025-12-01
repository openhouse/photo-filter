// frontend/photo-filter-frontend/app/models/person.js
import Model, { attr, hasMany } from '@ember-data/model';

export default class PersonModel extends Model {
  @attr('string') name;
  @attr('number') photoCount;
  @attr('date') earliestPhotoAt;
  @attr('date') latestPhotoAt;
  @attr('date') medianPhotoAt;
  @attr('string') heroUuid;
  @hasMany('photo', { async: true, inverse: 'persons' }) photos;
}
