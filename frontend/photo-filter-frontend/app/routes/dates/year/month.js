// app/routes/dates/year/month.js
import Route from '@ember/routing/route';
import fetch from 'fetch';

export default class DatesYearMonthRoute extends Route {
  queryParams = {
    sort: { refreshModel: true },
    order: { refreshModel: true },
    persons: { refreshModel: true },
  };

  async model(params) {
    const { year, month } = params;

    const response = await fetch(
      `http://localhost:3000/api/dates/${year}/${month}`,
    );
    const json = await response.json();
    const photos = json.data || [];

    let scoreAttributes = [];
    if (photos.length > 0 && photos[0].score) {
      scoreAttributes = Object.keys(photos[0].score);
    }

    const allPersons = new Set();
    for (let photo of photos) {
      if (Array.isArray(photo.persons)) {
        photo.persons.forEach((p) => allPersons.add(p.name ?? p));
      }
    }
    const sortedAllPersons = Array.from(allPersons).sort();

    return {
      year,
      month,
      photos,
      scoreAttributes,
      persons: sortedAllPersons,
      isDataReady: true,
    };
  }
}
