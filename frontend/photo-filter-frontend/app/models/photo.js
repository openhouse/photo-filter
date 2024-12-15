// frontend/photo-filter-frontend/app/models/photo.js
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class PhotoModel extends Model {
  @attr('string') originalName;
  @attr('string') originalFilename;
  @attr('string') filename;
  @attr('string') exportedFilename;
  @attr() score;
  @attr() exifInfo;

  @belongsTo('album', { async: false, inverse: 'photos' }) album;
  // Set async: false since we include all persons in the payload
  @hasMany('person', { async: false, inverse: 'photos' }) persons;
}
