// app/models/photo.js
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class PhotoModel extends Model {
  /* core attrs */
  @attr('string') originalName;
  @attr('string') originalFilename;
  @attr('string') exportedFilename;
  @attr('string') mediaType; // 'image' | 'video' | 'other'
  @attr() score;
  @attr() exifInfo;

  /* relationships */
  @belongsTo('album', { async: false, inverse: 'photos' }) album;
  @hasMany('person', { async: false, inverse: 'photos' }) persons;

  /* derived convenience */
  get isVideo() {
    return this.mediaType === 'video';
  }
}
