// app/components/date-nav.js
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import dayjs from 'dayjs'; // (Optional) If you want fancy month names

/**
 * date-nav
 *
 * Takes @datesData (the summary from /api/dates) and displays
 * a nested tree of years → months → days. Allows toggling each node.
 */
export default class DateNavComponent extends Component {
  @service router;

  // Arrays of expanded IDs
  @tracked expandedYears = [];
  @tracked expandedMonths = [];

  // By default, expand the current day (today)
  constructor() {
    super(...arguments);

    // If you want to auto-expand "today" in the tree:
    const now = new Date();
    const thisYear = String(now.getFullYear());
    const thisMonth = String(now.getMonth() + 1).padStart(2, '0');
    this.expandedYears = [thisYear];
    this.expandedMonths = [`${thisYear}-${thisMonth}`];
  }

  /**
   * Convert the @datesData object into an array of objects for easier iteration/sorting.
   * The shape from the server is { "2024": { count, months: { "12": {...} } }, ... }
   */
  get datesDataSorted() {
    if (!this.args.datesData) return [];

    // We transform:
    // {
    //   "2024": { count: 123, months: { "01": { count: 40, days: {"01": {count: 5}, ...} } }, ... }
    //   "2023": ...
    // }
    // into an array of { year, count, months: [...] } sorted descending by year
    const result = Object.keys(this.args.datesData)
      .map((yearStr) => {
        const yearBlock = this.args.datesData[yearStr];
        return {
          year: yearStr,
          count: yearBlock.count,
          months: yearBlock.months,
        };
      })
      .sort((a, b) => Number(b.year) - Number(a.year)); // newest year first

    return result.map((yearObj) => {
      const monthsSorted = Object.keys(yearObj.months)
        .map((m) => {
          const monthData = yearObj.months[m];
          return {
            month: m,
            monthName: this.monthName(m), // optional human-friendly name
            count: monthData.count,
            days: monthData.days,
          };
        })
        // sort numeric descending or ascending
        .sort((a, b) => Number(a.month) - Number(b.month));

      const monthsWithDays = monthsSorted.map((m) => {
        const daysSorted = Object.keys(m.days)
          .map((d) => {
            return { day: d, count: m.days[d].count };
          })
          .sort((a, b) => Number(a.day) - Number(b.day));
        return { ...m, daysSorted };
      });

      return {
        ...yearObj,
        monthsSorted: monthsWithDays,
      };
    });
  }

  monthName(monthStr) {
    // monthStr is "01", "02", ...
    // If you want a short label, or dayjs, or a custom table:
    const m = Number(monthStr);
    // Here we just do a simple table:
    const names = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return names[m - 1] || monthStr;
  }

  // Expand/collapse years
  @action
  toggleYear(year) {
    if (this.expandedYears.includes(year)) {
      this.expandedYears = this.expandedYears.filter((y) => y !== year);
    } else {
      this.expandedYears = [...this.expandedYears, year];
    }
  }

  // Expand/collapse a specific month
  @action
  toggleMonth(year, month) {
    const id = `${year}-${month}`;
    if (this.expandedMonths.includes(id)) {
      this.expandedMonths = this.expandedMonths.filter((x) => x !== id);
    } else {
      this.expandedMonths = [...this.expandedMonths, id];
    }
  }

  // When user clicks “View entire month”
  @action
  goToYearMonth(year, month) {
    this.router.transitionTo('dates.year.month', year, month);
  }

  // When user clicks on a day
  @action
  goToYearMonthDay(year, month, day) {
    this.router.transitionTo('dates.year.month.day', year, month, day);
  }

  // Utility used in the template to see if an array includes a value
  contains(val, arr) {
    return arr.includes(val);
  }
}
