// backend/tests/controllers/api/albums-controller.test.js

import { jest } from "@jest/globals";
import { getAlbumsData } from "../../../controllers/api/albums-controller.js";
import httpMocks from "node-mocks-http";
import fs from "fs-extra";
import path from "path";
import * as albumsStore from "../../../utils/albums-store.js";

describe("getAlbumsData", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return albums data in JSON:API format", async () => {
    // Mock request and response
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();

    // Mock fs.readJson to return sample data
    const sampleData = [
      { uuid: "album-1", title: "Album 1" },
      { uuid: "album-2", title: "Album 2" },
    ];

    jest.spyOn(albumsStore, "ensureAlbumsExported").mockResolvedValue();
    jest.spyOn(albumsStore, "readExportStatus").mockResolvedValue({ status: "ready" });
    jest
      .spyOn(albumsStore, "readJsonWithRetry")
      .mockResolvedValue(sampleData);
    jest
      .spyOn(albumsStore.albumsPaths, "albumsPath", "get")
      .mockReturnValue(path.join("/tmp", "albums.json"));
    jest
      .spyOn(albumsStore.albumsPaths, "dataDir", "get")
      .mockReturnValue(path.join("/tmp", "data"));
    jest.spyOn(fs, "readJson").mockResolvedValue([]);
    jest.spyOn(fs, "pathExists").mockResolvedValue(true);

    await getAlbumsData(req, res);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.length).toBe(2);
    expect(data.data[0]).toHaveProperty("type", "album");
    expect(data.data[0]).toHaveProperty("id", "album-1");
    expect(data.data[0].attributes).toHaveProperty("title", "Album 1");
  });
});
