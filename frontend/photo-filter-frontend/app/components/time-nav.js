// frontend/photo-filter-frontend/app/components/time-nav.js

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import config from 'photo-filter-frontend/config/environment';
import { service } from '@ember/service';

/**
 * TimeNavComponent
 *
 * - Fetches our time index JSON from `/api/time-index`.
 * - Maintains a "selectedDates" array, which is appended to the route’s query params.
 * - Uses a computed getter `selectedDatesArray` to avoid "Cannot convert undefined or null to object."
 */
export default class TimeNavComponent extends Component {
  @service router;

  @tracked timeIndex = null; // Will hold the response from /api/time-index
  @tracked isLoading = true; // A flag to show “Loading…” until data is fetched
  @tracked selectedDates = null; // Could be null, undefined, or array from query params

  constructor() {
    super(...arguments);
    this.loadTimeIndex();
  }

  /**
   * A safe getter that *always* returns an array,
   * even if `this.selectedDates` is null or undefined.
   */
  get selectedDatesArray() {
    if (Array.isArray(this.selectedDates)) {
      return this.selectedDates;
    }
    return [];
  }

  /**
   * Async load of the time index data from the server.
   */
  async loadTimeIndex() {
    try {
      const response = await fetch(`${config.APP.apiHost}/api/time-index`);
      const data = await response.json();
      this.timeIndex = data; // e.g. { years: [ { year: 2024, months: [...] }, ... ] }
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading time index:', error);
      this.isLoading = false;
    }
  }

  /**
   * Called when the user toggles a checkbox for year, month, or day.
   * - Uses `this.selectedDatesArray` to avoid referencing null/undefined.
   */
  @action
  toggleSelection(dateKey) {
    let updated = [...this.selectedDatesArray];

    if (updated.includes(dateKey)) {
      updated = updated.filter((d) => d !== dateKey);
    } else {
      updated.push(dateKey);
    }
    // Update our main tracked property:
    this.selectedDates = updated.sort();

    // Push the updated selection into route query params
    this.updateQueryParams();
  }

  /**
   * Synchronizes our selectedDates to the route’s query param "dates" as a JSON string.
   */
  updateQueryParams() {
    let currentRouteName = this.router.currentRouteName;
    let currentRouteParams = this.router.currentRoute.params || {};
    let albumId = currentRouteParams.album_id || null; // If we’re on an album route
    let currentQp = this.router.currentRoute.queryParams || {};

    // Convert our array -> JSON
    const datesJson = JSON.stringify(this.selectedDatesArray);

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
   * Utility to build the dateKey string
   * e.g. buildDateKey(2025) => "2025"
   *      buildDateKey(2025, 3) => "2025-03"
   *      buildDateKey(2025, 3, 14) => "2025-03-14"
   */
  buildDateKey(year, month = null, day = null) {
    if (day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
        2,
        '0',
      )}`;
    } else if (month) {
      return `${year}-${String(month).padStart(2, '0')}`;
    } else {
      return String(year);
    }
  }
}
