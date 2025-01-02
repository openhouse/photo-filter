// app/routes/dates/year.js
import Route from '@ember/routing/route';
import fetch from 'fetch';

export default class DatesYearRoute extends Route {
  async model(params) {
    const {
      year,
      sort = 'score.overall',
      order = 'desc',
      persons = [],
    } = params;

    const response = await fetch(`http://localhost:3000/api/dates/${year}`);
    const json = await response.json();
    const photos = json.data || [];

    // Figure out scoreAttributes by checking the first photo
    let scoreAttributes = [];
    if (photos.length > 0 && photos[0].score) {
      scoreAttributes = Object.keys(photos[0].score);
    }

    // Figure out all distinct person names
    const allPersons = new Set();
    for (let photo of photos) {
      if (Array.isArray(photo.persons)) {
        photo.persons.forEach((p) => allPersons.add(p.name ?? p));
      }
    }
    // Sort them if you like
    const sortedAllPersons = Array.from(allPersons).sort();

    return {
      year,
      photos,
      scoreAttributes,
      persons: sortedAllPersons,
      isDataReady: true,
    };
  }

  // Then define queryParams in a dedicated controller/dates/year.js as shown above
}
