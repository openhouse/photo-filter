// app/routes/dates/year/month/day.js
import Route from '@ember/routing/route';
import fetch from 'fetch';

/**
 * /dates/:year/:month/:day => show all photos for that exact day
 */
export default class DatesYearMonthDayRoute extends Route {
  async model(params) {
    const { year, month, day } = params;
    const response = await fetch(
      `http://localhost:3000/api/dates/${year}/${month}/${day}`,
    );
    const json = await response.json();
    return {
      year,
      month,
      day,
      photos: json.data || [],
    };
  }
}
