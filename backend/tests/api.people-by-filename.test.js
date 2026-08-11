import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import request from "supertest";
import { formatPreciseTimestamp } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDir = path.join(__dirname, "..", "testdata");

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pf-local-"));
const localRoot = path.join(tempRoot, "local");
const exportRoot = path.join(tempRoot, "export");
const metadataRoot = path.join(tempRoot, "metadata");
process.env.PF_LOCAL_ROOT = localRoot;
process.env.PF_EXPORT_ROOT = exportRoot;
process.env.PF_PEOPLE_METADATA_ROOT = metadataRoot;

await fs.ensureDir(localRoot);
await fs.ensureDir(exportRoot);
await fs.copy(path.join(fixturesDir, "albums"), path.join(localRoot, "albums"));
const libraryFixture = path.join(fixturesDir, "library");
if (await fs.pathExists(libraryFixture)) {
  await fs.copy(libraryFixture, path.join(localRoot, "library"));
} else {
  await fs.ensureDir(path.join(localRoot, "library"));
}
process.env.PF_LIBRARY_ROOT = path.join(localRoot, "library");

await fs.copy(fixturesDir, metadataRoot);

const { app } = await import("../app.js");

const exportedDisk = `${formatPreciseTimestamp(
  "2022-12-01T17:42:42.329834Z",
)}-IMG_5899.jpg`;
const exportedJsonOnly = `${formatPreciseTimestamp(
  "2021-08-15T05:04:03.123456Z",
)}-IMG_1001.jpg`;
const exportedUnicode = `${formatPreciseTimestamp(
  "2023-02-05T08:09:10.000001Z",
)}-IMG_Señorita 1.jpg`;
const exportedMetadataOnly = "20251104T002809000000Z-DSCF5169.jpg";

describe("people-by-filename endpoint", () => {
  afterAll(async () => {
    await fs.remove(tempRoot);
    delete process.env.PF_LOCAL_ROOT;
    delete process.env.PF_EXPORT_ROOT;
    delete process.env.PF_LIBRARY_ROOT;
    delete process.env.PF_PEOPLE_METADATA_ROOT;
  });

  it("serves path variant, caches responses, and excludes labels", async () => {
    const first = await request(app)
      .get(`/api/people/by-filename/${encodeURIComponent(exportedDisk)}`)
      .set("Accept", "application/json");

    expect(first.status).toBe(200);
    expect(first.type).toMatch(/application\/json/);
    expect(["disk", "json"]).toContain(first.headers["x-pf-resolve"]);
    expect(first.body.filename).toBe(exportedDisk);
    expect(first.body.people).toEqual(
      ["Alice", "Bob", "Carol"].sort((a, b) => a.localeCompare(b)),
    );
    expect(first.body.people).not.toContain("Outdoor");
    expect(first.body.people).not.toContain("Building");

    const second = await request(app)
      .get(`/api/people/by-filename/${encodeURIComponent(exportedDisk)}`)
      .set("Accept", "application/json");

    expect(second.status).toBe(200);
    expect(second.headers["x-pf-resolve"]).toBe("cache");
    expect(second.body.people).toEqual(first.body.people);
  });

  it("supports the query variant with encoded characters", async () => {
    const encoded = encodeURIComponent(exportedUnicode);
    const res = await request(app)
      .get(`/api/people/by-filename?filename=${encoded}`)
      .set("Accept", "application/json");

    const expectedNames = ["Álvaro", "Élodie", "Renée"].sort((a, b) =>
      a.localeCompare(b),
    );

    expect(res.status).toBe(200);
    expect(["disk", "json"]).toContain(res.headers["x-pf-resolve"]);
    expect(res.body.filename).toBe(exportedUnicode);
    expect(res.body.people).toEqual(expectedNames);
  });

  it("serves the legacy alias path", async () => {
    const res = await request(app)
      .get(`/api/photos/by-filename/${encodeURIComponent(exportedDisk)}/persons`)
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(["cache", "disk", "json"]).toContain(res.headers["x-pf-resolve"]);
  });

  it("falls back to photos.json when image is missing on disk", async () => {
    const res = await request(app)
      .get(`/api/people/by-filename/${encodeURIComponent(exportedJsonOnly)}`)
      .set("Accept", "application/json");

    const expected = ["Charlie", "Eve", "Mallory"].sort((a, b) =>
      a.localeCompare(b),
    );

    expect(res.status).toBe(200);
    expect(["disk", "json"]).toContain(res.headers["x-pf-resolve"]);
    expect(res.body.filename).toBe(exportedJsonOnly);
    expect(res.body.people).toEqual(expected);
  });

  it("resolves people using metadata-provided basenames", async () => {
    const res = await request(app)
      .get(`/api/people/by-filename/${encodeURIComponent(exportedMetadataOnly)}`)
      .set("Accept", "application/json");

    const expected = [
      "AM Emily Gallagher (NY State Assembly Member, Greenpoint)",
      "Community Member",
      "Emily Gallagher",
      "Local Organizer",
    ].sort((a, b) => a.localeCompare(b));

    expect(res.status).toBe(200);
    expect(["disk", "json"]).toContain(res.headers["x-pf-resolve"]);
    expect(res.body.filename).toBe(exportedMetadataOnly);
    expect(res.body.people).toEqual(expected);
  });

  it("returns 400 for missing filename in query variant", async () => {
    const res = await request(app)
      .get("/api/people/by-filename")
      .set("Accept", "application/json");

    expect(res.status).toBe(400);
    expect(res.headers["x-pf-resolve"]).toBe("invalid");
    expect(res.body.errors[0].detail).toBe("Filename is required");
  });

  it("returns 400 for invalid filename attempts", async () => {
    const res = await request(app)
      .get("/api/people/by-filename?filename=../bad.jpg")
      .set("Accept", "application/json");

    expect(res.status).toBe(400);
    expect(res.headers["x-pf-resolve"]).toBe("invalid");
    expect(res.body.errors[0].detail).toBe("Invalid filename");
  });

  it("caches negative lookups", async () => {
    const missing = "20990101T000000000000Z-NOTREAL.jpg";
    const first = await request(app)
      .get(`/api/people/by-filename/${missing}`)
      .set("Accept", "application/json");
    expect(first.status).toBe(200);
    expect(first.headers["x-pf-resolve"]).toBe("miss");
    expect(first.body).toEqual({ filename: missing, people: [] });

    const second = await request(app)
      .get(`/api/people/by-filename/${missing}`)
      .set("Accept", "application/json");
    expect(second.status).toBe(200);
    expect(second.headers["x-pf-resolve"]).toBe("miss");
    expect(second.body).toEqual({ filename: missing, people: [] });
  });

  it("handles concurrent requests without deadlock", async () => {
    const [a, b] = await Promise.all([
      request(app)
        .get(`/api/people/by-filename/${encodeURIComponent(exportedDisk)}`)
        .set("Accept", "application/json"),
      request(app)
        .get(`/api/people/by-filename/${encodeURIComponent(exportedDisk)}`)
        .set("Accept", "application/json"),
    ]);

    const payload = ["Alice", "Bob", "Carol"].sort((x, y) =>
      x.localeCompare(y),
    );

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.people).toEqual(payload);
    expect(b.body.people).toEqual(payload);
    const headerValues = [a.headers["x-pf-resolve"], b.headers["x-pf-resolve"]];
    headerValues.forEach((value) =>
      expect(["cache", "json", "disk"]).toContain(value),
    );
    expect(headerValues).toContain("cache");
  });

  it("bulk-resolves filenames from one pinned people-index snapshot", async () => {
    const first = await request(app)
      .post("/api/photos/by-filenames/persons")
      .send({
        filenames: [exportedDisk, exportedMetadataOnly],
        refresh: "verify",
      })
      .set("Accept", "application/json");

    expect(first.status).toBe(200);
    expect(first.body.meta.corpusSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.meta.sourceFreshness).toBe("unknown");
    expect(first.body.data).toEqual([
      expect.objectContaining({
        filename: exportedDisk,
        status: "exact",
        people: ["Alice", "Bob", "Carol"].sort((a, b) =>
          a.localeCompare(b),
        ),
      }),
      expect.objectContaining({
        filename: exportedMetadataOnly,
        status: "alias",
        resolvedFilename: "20251101T000000000000Z-DSCF5169.jpg",
        people: [
          "AM Emily Gallagher (NY State Assembly Member, Greenpoint)",
          "Community Member",
          "Emily Gallagher",
          "Local Organizer",
        ].sort((a, b) => a.localeCompare(b)),
      }),
    ]);

    const pinned = await request(app)
      .post("/api/photos/by-filenames/persons")
      .send({
        filenames: [exportedDisk],
        refresh: "snapshot",
        expectedCorpusSha256: first.body.meta.corpusSha256,
      });
    expect(pinned.status).toBe(200);
    expect(pinned.body.meta.indexStatus).toBe("snapshot");

    const mismatched = await request(app)
      .post("/api/photos/by-filenames/persons")
      .send({
        filenames: [exportedDisk],
        refresh: "snapshot",
        expectedCorpusSha256: "0".repeat(64),
      });
    expect(mismatched.status).toBe(409);
    expect(mismatched.body.errors[0].code).toBe("PEOPLE_CORPUS_MISMATCH");
  });

  it("rejects bulk requests above the 500-filename contract", async () => {
    const res = await request(app)
      .post("/api/photos/by-filenames/persons")
      .send({ filenames: Array.from({ length: 501 }, (_, i) => `P${i}.jpg`) });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].code).toBe("TOO_MANY_FILENAMES");
  });

  it("accepts the maximum batch even when semantic filenames exceed 100kb", async () => {
    const filenames = Array.from(
      { length: 500 },
      (_, i) => `${String(i).padStart(3, "0")}-${"semantic-".repeat(25)}.jpg`,
    );
    const res = await request(app)
      .post("/api/photos/by-filenames/persons")
      .send({ filenames, refresh: "verify" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(500);
  });

  it("returns the same people through bulk and legacy lookup paths", async () => {
    const filenames = [
      exportedDisk,
      exportedJsonOnly,
      exportedMetadataOnly,
      "20990101T000000000000Z-NOTREAL-2.jpg",
    ];
    const legacy = await Promise.all(
      filenames.map((filename) =>
        request(app).get(
          `/api/photos/by-filename/${encodeURIComponent(filename)}/persons`,
        ),
      ),
    );
    const bulk = await request(app)
      .post("/api/photos/by-filenames/persons")
      .send({ filenames, refresh: "verify" });

    expect(bulk.status).toBe(200);
    expect(bulk.body.data.map(({ filename, people }) => ({ filename, people })))
      .toEqual(legacy.map((response) => response.body));
  });

  it("returns JSON 404 for unmatched api routes", async () => {
    const res = await request(app)
      .get("/api/not-a-real-route")
      .set("Accept", "application/json");

    expect(res.status).toBe(404);
    expect(res.type).toMatch(/application\/json/);
    expect(res.body.errors?.[0]?.detail).toBe("Not Found");
  });
});
