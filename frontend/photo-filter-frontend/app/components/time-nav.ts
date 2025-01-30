// frontend/photo-filter-frontend/app/components/time-nav.ts

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import config from 'photo-filter-frontend/config/environment';
import type RouterService from '@ember/routing/router-service';
import { isArray as emberIsArray } from '@ember/array';

/**
 * Data structure for the time index. Because it’s dynamic JSON,
 * we define an interface that roughly matches: { years: YearObject[] }.
 */
interface TimeIndexData {
  years: YearObject[];
}

interface YearObject {
  year: number;
  months: MonthObject[];
}

interface MonthObject {
  month: number;
  days?: number[];
}

/**
 * This component fetches the time-based index (Year->Month->Day)
 * from /api/time-index, stores it in `this.timeIndex`, and
 * manages a list of `selectedDates` keys.
 */
export default class TimeNavComponent extends Component {
  @service declare router: RouterService;

  /** Raw time index data from the server. We default to null until loaded. */
  @tracked timeIndex: TimeIndexData | null = null;

  /** Flag to show “Loading…” while fetching data. */
  @tracked isLoading = true;

  /** The array of date-keys (like "2024", "2024-12", "2024-12-07") the user has selected. */
  @tracked selectedDates: string[] = [];

  constructor(owner: unknown, args: Record<string, unknown>) {
    super(owner, args);
    this.loadTimeIndex();
  }

  /**
   * Template calls this to see if a certain dateKey is in our selectedDates list.
   * Marked with @action so that Ember properly binds `this`.
   */
  @action
  selectedDatesIncludes(key: string): boolean {
    return this.selectedDates.includes(key);
  }

  /**
   * The main fetch for our /api/time-index resource.
   */
  async loadTimeIndex(): Promise<void> {
    try {
      const response = await fetch(`${config.APP.apiHost}/api/time-index`);
      const data: unknown = await response.json();

      if (!data || typeof data !== 'object') {
        console.warn('Time index response was invalid:', data);
        this.timeIndex = { years: [] };
      } else {
        const typed = data as Partial<TimeIndexData>;
        if (!emberIsArray(typed.years)) {
          console.warn('timeIndex missing "years" array:', data);
          this.timeIndex = { years: [] };
        } else {
          this.timeIndex = { years: typed.years };
        }
      }
    } catch (err) {
      console.error('Error loading time index:', err);
      this.timeIndex = { years: [] };
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Called by checkboxes in the template to toggle a dateKey in `selectedDates`.
   * Also marked with @action for correct context binding.
   */
  @action
  toggleSelection(dateKey: string): void {
    let updated = [...this.selectedDates];
    if (updated.includes(dateKey)) {
      updated = updated.filter((d) => d !== dateKey);
    } else {
      updated.push(dateKey);
    }
    updated.sort();
    this.selectedDates = updated;

    this.updateQueryParams();
  }

  /**
   * Update the current route's query params to reflect the selected dates.
   */
  updateQueryParams(): void {
    const currentRouteName = this.router.currentRouteName;
    const albumId = this.router.currentRoute.params?.album_id as
      | string
      | undefined;
    const currentQp = this.router.currentRoute.queryParams || {};
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
   * Helper for building date keys: "YYYY", "YYYY-MM", or "YYYY-MM-DD".
   */
  buildDateKey(year: number, month?: number, day?: number): string {
    if (day !== undefined) {
      // e.g. "2025-12-31"
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (month !== undefined) {
      // e.g. "2025-12"
      return `${year}-${String(month).padStart(2, '0')}`;
    } else {
      // e.g. "2025"
      return String(year);
    }
  }
}
