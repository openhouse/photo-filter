import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class CurrentAlbumService extends Service {
  @tracked isAlbumRoute = false;
  @tracked albumTitle = null;
  @tracked scoreAttributes = [];
  @tracked sortAttribute = 'score.overall';
  @tracked sortOrder = 'desc';
  @tracked persons = [];
}
