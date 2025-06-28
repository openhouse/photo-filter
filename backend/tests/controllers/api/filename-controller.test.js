import { jest } from "@jest/globals";
import { getPeopleByFilename } from "../../../controllers/api/filename-controller.js";
import httpMocks from "node-mocks-http";
import fs from "fs-extra";
import { formatPreciseTimestamp } from "../../../utils/helpers.js";
import path from "path";

describe("getPeopleByFilename", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns person names when photo is found", async () => {
    const date = "2025-05-30T23:35:13.160Z";
    const ts = formatPreciseTimestamp(date);
    const exported = `${ts}-_DSF7004.jpg`;

    const req = httpMocks.createRequest({ params: { filename: exported } });
    const res = httpMocks.createResponse();

    jest.spyOn(fs, "pathExists").mockResolvedValue(true);
    jest.spyOn(fs, "readdir").mockResolvedValue([
      { name: "album1", isDirectory: () => true },
    ]);
    jest.spyOn(fs, "readJson").mockResolvedValue([
      {
        original_filename: "_DSF7004.jpg",
        date,
        persons: ["Alice", "Bob"],
      },
    ]);

    await getPeopleByFilename(req, res);

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data.data).toEqual(["Alice", "Bob"]);
  });

  it("returns 404 when no photo matches", async () => {
    const req = httpMocks.createRequest({ params: { filename: "notfound.jpg" } });
    const res = httpMocks.createResponse();

    jest.spyOn(fs, "pathExists").mockResolvedValue(true);
    jest.spyOn(fs, "readdir").mockResolvedValue([
      { name: "album1", isDirectory: () => true },
    ]);
    jest.spyOn(fs, "readJson").mockResolvedValue([]);

    await getPeopleByFilename(req, res);

    expect(res.statusCode).toBe(404);
  });
});
