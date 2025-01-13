import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import config from 'photo-filter-frontend/config/environment';
import { service } from '@ember/service';

export default class TimeNavComponent extends Component {
  @service router;

  @tracked timeIndex = null;
  @tracked isLoading = true;
  @tracked selectedDates = [];

  constructor() {
    super(...arguments);
    this.loadTimeIndex();
  }

  async loadTimeIndex() {
    try {
      const response = await fetch(`${config.APP.apiHost}/api/time-index`);
      const data = await response.json();
      this.timeIndex = data;
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading time index:', error);
      this.isLoading = false;
    }
  }

  @action
  toggleSelection(dateKey) {
    let updated = [...this.selectedDates];
    if (updated.includes(dateKey)) {
      updated = updated.filter((d) => d !== dateKey);
    } else {
      updated.push(dateKey);
    }
    this.selectedDates = updated.sort();

    this.updateQueryParams();
  }

  updateQueryParams() {
    let currentRouteName = this.router.currentRouteName;
    let albumId = this.router.currentRoute.params.album_id || null;
    let currentQp = this.router.currentRoute.queryParams || {};

    const datesJson = JSON.stringify(this.selectedDates);

    if (albumId) {
      this.router.transitionTo(currentRouteName, albumId, {
        queryParams: {
          ...currentQp,
          dates: datesJson,
        },
      });
    } else {
      this.router.transitionTo(currentRouteName, {
        queryParams: {
          ...currentQp,
          dates: datesJson,
        },
      });
    }
  }

  /**
   * E.g. buildDateKey(2025) => "2025"
   *      buildDateKey(2025, 3) => "2025-03"
   *      buildDateKey(2025, 3, 14) => "2025-03-14"
   */
  buildDateKey(year, month = null, day = null) {
    if (day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (month) {
      return `${year}-${String(month).padStart(2, '0')}`;
    } else {
      return String(year);
    }
  }
}
