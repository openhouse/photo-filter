import express from "express";
import fs from "fs-extra";
import os from "os";
import path from "path";
import request from "supertest";

const ORIGINAL_ENV = { ...process.env };

function makeExportedName(stem = "test") {
  return `20200101T000000000000Z-${stem}.jpg`;
}

describe("GET /library/images/:exportedName", () => {
  let app;
  let libraryRoot;
  const exportedName = makeExportedName("photo");

  beforeAll(async () => {
    libraryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pf-library-"));
    process.env.PF_LIBRARY_ROOT = libraryRoot;

    // Create a file that matches the expected library layout
    const targetPath = path.join(libraryRoot, "2020", "01", "01", exportedName);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, "test-image");

    const module = await import("../middleware/library-images.js");
    const createLibraryImagesMiddleware = module.createLibraryImagesMiddleware;

    app = express();
    app.get("/library/images/:exportedName", createLibraryImagesMiddleware({ fsClient: fs }));
  });

  afterAll(async () => {
    Object.assign(process.env, ORIGINAL_ENV);
    if (!ORIGINAL_ENV.PF_LIBRARY_ROOT) {
      delete process.env.PF_LIBRARY_ROOT;
    }
    await fs.remove(libraryRoot).catch(() => {});
  });

  it("serves a known exported name", async () => {
    const res = await request(app).get(`/library/images/${exportedName}`);
    expect(res.status).toBe(200);
    expect(res.text).toBe("test-image");
  });

  it("rejects unsafe basenames", async () => {
    const res = await request(app).get("/library/images/../../etc/passwd");
    expect(res.status).toBe(400);
  });

  it("returns 404 when basename is well-formed but missing", async () => {
    const missing = makeExportedName("missing");
    const res = await request(app).get(`/library/images/${missing}`);
    expect(res.status).toBe(404);
  });
});
