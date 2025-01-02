// app/routes/application.js
import Route from '@ember/routing/route';
import fetch from 'fetch';

export default class ApplicationRoute extends Route {
  async model() {
    // 1. Fetch Albums from our backend
    let albumsResponse = await fetch('http://localhost:3000/api/albums');
    let albumsJson = await albumsResponse.json();

    // 2. Fetch Date Tree (year→month→day summary)
    let datesResponse = await fetch('http://localhost:3000/api/dates');
    let datesJson = await datesResponse.json();

    return {
      // JSON:API usually has an array in albumsJson.data
      albums: albumsJson.data || [],
      // The date summary is in datesJson.data
      dateTree: datesJson.data || {},
    };
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    // Push these arrays/objects onto the application controller’s tracked properties
    controller.albums = model.albums; // => this.albums in template
    controller.dateTree = model.dateTree; // => this.dateTree in template
  }
}
