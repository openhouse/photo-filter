// frontend/photo-filter-frontend/app/models/person.js
import Model, { attr, hasMany } from '@ember-data/model';

export default class PersonModel extends Model {
  @attr('string') name;
  @attr('string') displayName;
  @attr('number') photoCount;
  @attr('date') earliestPhotoAt;
  @attr('date') latestPhotoAt;
  @attr('date') medianPhotoAt;
  @attr('string') heroUuid;
  @attr('string') heroExportedName;
  @attr('string') heroUuidEarliest;
  @attr('string') heroUuidMedian;
  @attr('string') heroUuidLatest;
  @attr('string') heroUuidHighlight;
  @attr('string') earliestExportedName;
  @attr('string') medianExportedName;
  @attr('string') latestExportedName;
  @attr('string') highlightExportedName;
  @hasMany('photo', { async: true, inverse: 'persons' }) photos;
}
