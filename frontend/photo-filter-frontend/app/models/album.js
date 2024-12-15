// frontend/photo-filter-frontend/app/models/album.js
import Model, { attr, hasMany } from '@ember-data/model';

export default class AlbumModel extends Model {
  @attr('string') title;
  @attr('boolean') isSmart;
  @hasMany('photo', { async: false, inverse: 'album' }) photos;
  // Change persons to async: false since we include all data and don't want extra requests
  @hasMany('person', { async: false, inverse: null }) persons;
}
