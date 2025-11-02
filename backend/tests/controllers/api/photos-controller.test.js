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
    delete process.env.PF_PREP_ON_RENDER;
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

    jest
      .spyOn(fs, "readJson")
      .mockImplementation(async (target) => {
        if (target.endsWith("photos.json")) {
          return samplePhotos;
        }
        if (target.endsWith("status.json")) {
          return { status: "ready" };
        }
        return [];
      });
    jest.spyOn(fs, "pathExists").mockImplementation(async (target) => {
      if (target.endsWith("photos.json")) return true;
      if (target.endsWith("status.json")) return true;
      if (target.includes("images")) return false;
      return false;
    });
    jest.spyOn(fs, "readdir").mockResolvedValue([]);

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

  it("returns 202 when album needs preparation", async () => {
    const req = httpMocks.createRequest({
      params: { albumUUID: "album-1" },
      query: {},
    });
    const res = httpMocks.createResponse();

    const tempRoot = path.join(__dirname, "..", "..", "__tmp-local__");
    process.env.PF_LOCAL_ROOT = tempRoot;
    process.env.PF_EXPORT_ROOT = path.join(tempRoot, "exports");
    const statusDir = path.join(process.env.PF_EXPORT_ROOT, "album-1");
    await fs.ensureDir(statusDir);
    await fs.writeJson(path.join(statusDir, "status.json"), { status: "needs-prep" });

    const photosPath = path.join(tempRoot, "local", "albums", "album-1", "photos.json");
    const albumsRoot = path.join(tempRoot, "local", "albums");
    jest.spyOn(fs, "pathExists").mockImplementation(async (target) => {
      if (target === photosPath) {
        return false;
      }
      if (target === albumsRoot) {
        return true;
      }
      return false;
    });

    jest.spyOn(fs, "readJson").mockResolvedValue([]);

    await getPhotosByAlbumData(req, res);

    expect(res.statusCode).toBe(202);
    expect(res.getHeader("X-PF-Export-Status")).toBeDefined();
    expect(res.getHeader("X-PF-Album-Count")).toBe("0");
    expect(res.getHeader("Link")).toBe("</api/albums/album-1/status>; rel=\"status\"");
    const body = res._getJSONData();
    expect(body.meta.exportStatus.status).toBe("needs-prep");
    expect(body.meta.nextSteps.prepareQuery).toContain("prepare=1");
  });

  it("returns 200 when prepare query is requested", async () => {
    const req = httpMocks.createRequest({
      params: { albumUUID: "album-1" },
      query: { prepare: "1" },
    });
    const res = httpMocks.createResponse();

    const tempRoot = path.join(__dirname, "..", "..", "__tmp-local__");
    process.env.PF_LOCAL_ROOT = tempRoot;
    process.env.PF_EXPORT_ROOT = path.join(tempRoot, "exports");
    process.env.PF_PREP_ON_RENDER = "1";
    const statusDir = path.join(process.env.PF_EXPORT_ROOT, "album-1");
    await fs.ensureDir(statusDir);
    await fs.writeJson(path.join(statusDir, "status.json"), { status: "ready" });

    const photosPath = path.join(tempRoot, "local", "albums", "album-1", "photos.json");
    const statusPath = path.join(tempRoot, "local", "albums", "album-1", "status.json");
    const albumsRoot = path.join(tempRoot, "local", "albums");
    const imagesDir = path.join(tempRoot, "local", "albums", "album-1", "images");
    jest.spyOn(fs, "pathExists").mockImplementation(async (target) => {
      if (target === photosPath) {
        return true;
      }
      if (target === statusPath) {
        return true;
      }
      if (target === albumsRoot) {
        return true;
      }
      if (target.includes(path.join("images", ".skipped-empty"))) {
        return false;
      }
      if (target === imagesDir) {
        return true;
      }
      return false;
    });

    const samplePhotos = [
      {
        uuid: "photo-1",
        original_filename: "photo1.jpg",
        score: { overall: 0.9 },
        date: "2025-05-30T23:35:13.160Z",
        persons: ["Alice"],
      },
    ];

    jest.spyOn(fs, "readJson").mockImplementation(async (target) => {
      if (target === photosPath) {
        return samplePhotos;
      }
      if (target === statusPath) {
        return { status: "ready" };
      }
      return [];
    });

    jest.spyOn(fs, "readdir").mockResolvedValue(["20240101-photo-1.jpg"]);

    await getPhotosByAlbumData(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getHeader("X-PF-Export-Status")).toBe("ready");
    expect(res.getHeader("X-PF-Album-Count")).toBe("1");
    expect(res.getHeader("Link")).toBe("</api/albums/album-1/status>; rel=\"status\"");
    const body = res._getJSONData();
    expect(body.data).toHaveLength(1);
    expect(body.meta.exportStatus.status).toBe("ready");
  });
});
