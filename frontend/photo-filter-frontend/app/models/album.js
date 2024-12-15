// frontend/photo-filter-frontend/app/models/album.js
import Model, { attr, hasMany } from '@ember-data/model';

export default class AlbumModel extends Model {
  @attr('string') title;
  @attr('boolean') isSmart;
  @hasMany('photo', { async: true, inverse: 'album' }) photos;
  @hasMany('person', { async: true, inverse: null }) persons; // persons now included, inverse set to null
}
