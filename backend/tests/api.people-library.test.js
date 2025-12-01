import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import request from "supertest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDir = path.join(__dirname, "..", "testdata");
const dataDir = path.join(__dirname, "..", "data");
const peopleFixture = path.join(fixturesDir, "library", "people-index.json");

async function setupFixtureData() {
  await fs.remove(dataDir);
  await fs.ensureDir(path.join(dataDir, "library"));
  await fs.copy(peopleFixture, path.join(dataDir, "library", "people-index.json"));
}

describe("GET /api/library/people", () => {
  beforeAll(async () => {
    await setupFixtureData();
  });

  afterAll(async () => {
    await fs.remove(dataDir);
  });

  it("returns JSON:API people sorted by the requested field", async () => {
    const { app } = await import("../app.js");

    const res = await request(app)
      .get("/api/library/people?sort=medianPhotoAt&order=asc")
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/application\/json/);
    expect(Array.isArray(res.body?.data)).toBe(true);
    expect(res.body.data.every((item) => item.type === "person")).toBe(true);

    const medians = res.body.data.map((entry) => entry.attributes.medianPhotoAt);
    expect(medians).toEqual([
      "2019-05-02T00:00:00Z",
      "2020-01-02T00:00:00Z",
      "2021-01-01T12:00:00Z",
    ]);
  });

  it("supports descending ordering", async () => {
    const { app } = await import("../app.js");

    const res = await request(app)
      .get("/api/library/people?sort=medianPhotoAt&order=desc")
      .set("Accept", "application/json");

    const medians = res.body.data.map((entry) => entry.attributes.medianPhotoAt);
    expect(medians).toEqual([
      "2021-01-01T12:00:00Z",
      "2020-01-02T00:00:00Z",
      "2019-05-02T00:00:00Z",
    ]);
  });
});
