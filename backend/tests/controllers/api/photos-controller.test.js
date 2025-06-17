// backend/tests/controllers/api/photos-controller.test.js

import { jest } from "@jest/globals";
import { getPhotosByAlbumData } from "../../../controllers/api/photos-controller.js";
import httpMocks from "node-mocks-http";
import fs from "fs-extra";

describe("getPhotosByAlbumData", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ignores null placeholders in photos.json and responds OK", async () => {
    const req = httpMocks.createRequest({
      params: { albumUUID: "album-xyz" },
      query: {},
    });
    const res = httpMocks.createResponse();

    /* ── fake photos.json with a null hole ───────────────────────── */
    const sample = [
      null, // <- the bad entry that previously crashed
      {
        uuid: "photo-1",
        original_filename: "foo.jpg",
        date: "2025-06-17 12:00:00",
        score: { overall: 0.99 },
      },
      {
        uuid: "photo-2",
        original_filename: "bar.jpg",
        date: "2025-06-17 12:01:00",
        score: { overall: 0.42 },
      },
    ];

    /* ── stub all fs + helper calls that touch the real file‑system ─ */
    jest.spyOn(fs, "readJson").mockResolvedValue(sample);
    jest.spyOn(fs, "ensureDir").mockResolvedValue();
    jest.spyOn(fs, "pathExists").mockResolvedValue(true);
    jest.spyOn(fs, "readdir").mockResolvedValue(["dummy"]);
    jest.spyOn(fs, "rename").mockResolvedValue();
    jest.spyOn(fs, "readJson").mockResolvedValue(sample);

    /* fast‑glob & date helpers are internal – no need to stub as we
       never hit them with the mocked fs paths in this unit test. */

    await getPhotosByAlbumData(req, res);

    expect(res.statusCode).toBe(200);

    const body = res._getJSONData();
    // Only 2 valid records should remain
    expect(body.data).toHaveLength(2);
    expect(body.meta.filteredOut).toBe(1);
  });
});
