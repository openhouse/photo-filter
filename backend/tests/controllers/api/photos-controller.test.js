// backend/tests/controllers/api/photos-controller.test.js

import { jest } from "@jest/globals";
import { getPhotosByAlbumData } from "../../../controllers/api/photos-controller.js";
import httpMocks from "node-mocks-http";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("getPhotosByAlbumData", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.PF_LOCAL_ROOT;
    delete process.env.PF_EXPORT_ROOT;
  });

  it("should return photos data in JSON:API format", async () => {
    const req = httpMocks.createRequest({
      params: {
        albumUUID: "album-1",
      },
      query: {
        sort: "score.overall",
        order: "desc",
      },
    });
    const res = httpMocks.createResponse();

    // Mock fs.readJson to return sample data
    const samplePhotos = [
      {
        uuid: "photo-1",
        original_filename: "photo1.jpg",
        score: { overall: 0.9 },
        date: "2025-05-30T23:35:13.160Z",
        persons: ["Alice"],
      },
      {
        uuid: "photo-2",
        original_filename: "photo2.jpg",
        score: { overall: 0.8 },
        date: "2025-05-30T23:36:13.160Z",
        persons: ["Bob"],
      },
    ];

    jest.spyOn(fs, "readJson").mockResolvedValue(samplePhotos);
    jest.spyOn(fs, "pathExists").mockResolvedValue(true);

    const tempRoot = path.join(__dirname, '..', '..', '__tmp-local__');
    process.env.PF_LOCAL_ROOT = tempRoot;
    process.env.PF_EXPORT_ROOT = path.join(tempRoot, 'exports');
    await getPhotosByAlbumData(req, res);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.length).toBe(2);
    expect(data.data[0]).toHaveProperty("type", "photo");
    expect(data.data[0]).toHaveProperty("id", "photo-1");
    expect(data.data[0].attributes).toHaveProperty("originalName", "photo1");
    expect(data.data[0].attributes.score).toHaveProperty("overall", 0.9);
  });
});
