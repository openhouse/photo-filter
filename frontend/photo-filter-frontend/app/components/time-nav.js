// frontend/photo-filter-frontend/app/components/time-nav.js

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import config from 'photo-filter-frontend/config/environment';
import { service } from '@ember/service';

/**
 * time-nav
 *
 * This component fetches the time index from /api/time-index and displays
 * a nested tree of Years → Months → Days. Each node has a checkbox, and
 * selecting them updates the `dates` array in the query params (coexisting
 * with person filters).
 */
export default class TimeNavComponent extends Component {
  @service router;

  @tracked timeIndex = null; // The structure from /api/time-index
  @tracked isLoading = true;
  @tracked selectedDates = []; // Array of strings like "2024-12-07"

  constructor() {
    super(...arguments);
    this.loadTimeIndex();
  }

  async loadTimeIndex() {
    try {
      const response = await fetch(`${config.APP.apiHost}/api/time-index`);
      const data = await response.json();
      this.timeIndex = data; // { years: [...] }
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading time index:', error);
      this.isLoading = false;
    }
  }

  /**
   * Called when the user toggles a checkbox (year, month, or day).
   */
  @action
  toggleSelection(dateKey) {
    // dateKey might be "2024" or "2024-12" or "2024-12-07"
    let updated = [...this.selectedDates];
    if (updated.includes(dateKey)) {
      updated = updated.filter((d) => d !== dateKey);
    } else {
      updated.push(dateKey);
    }
    this.selectedDates = updated.sort();

    // We add the array to the query params as JSON
    this.updateQueryParams();
  }

  /**
   * Pushes the current selectedDates array into the route's query param 'dates'.
   */
  updateQueryParams() {
    // Use the existing route (albums.album or some other route).
    // For example, if we’re on /albums/album/..., we merge in `dates=...`.
    // Or you might store it in some shared service.
    // The simplest is to do a transition that merges the new dates param:
    let currentRouteName = this.router.currentRouteName;
    let albumId = this.router.currentRoute.params.album_id;
    // Let’s unify it with persons if that’s how your route handles multiple filters:
    let currentQp = this.router.currentRoute.queryParams || {};

    // Convert selectedDates to string
    const datesJson = JSON.stringify(this.selectedDates);

    this.router.transitionTo(currentRouteName, albumId, {
      queryParams: {
        ...currentQp,
        dates: datesJson,
      },
    });
  }

  /**
   * Utility to build a dateKey string. E.g.:
   * - Year only: "2024"
   * - Year+Month: "2024-12"
   * - Year+Month+Day: "2024-12-07"
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
