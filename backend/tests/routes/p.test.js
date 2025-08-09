import { jest } from "@jest/globals";
import httpMocks from "node-mocks-http";
import fs from "fs-extra";

jest.unstable_mockModule("../../utils/lookup-uuid-from-exported.js", () => ({
  lookupUuidByExportedFilename: jest.fn(),
}));
jest.unstable_mockModule("../../utils/export-by-uuid.js", () => ({
  exportByUuids: jest.fn(),
}));
jest.unstable_mockModule("../../utils/job-queue.js", () => ({
  queue: { enqueue: jest.fn(), q: [] },
}));
jest.unstable_mockModule("../../utils/sse.js", () => ({ emit: jest.fn() }));

const { handle } = await import("../../routes/p.js");
const { lookupUuidByExportedFilename } = await import(
  "../../utils/lookup-uuid-from-exported.js"
);
const { queue } = await import("../../utils/job-queue.js");

describe("/p handler", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 with Retry-After 2 when enqueued", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { file: "20200101T010101000000Z-test.jpg" },
    });
    const res = httpMocks.createResponse();
    res.sendFile = jest.fn(() => res.status(200).end());
    jest.spyOn(fs, "pathExists").mockResolvedValue(false);
    lookupUuidByExportedFilename.mockResolvedValue("u1");

    await handle(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.getHeader("Retry-After")).toBe("2");
    expect(queue.enqueue).toHaveBeenCalled();
  });

  it("returns 404 with Retry-After 4 when unknown", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { file: "20200101T010101000000Z-test.jpg" },
    });
    const res = httpMocks.createResponse();
    res.sendFile = jest.fn(() => res.status(200).end());
    jest.spyOn(fs, "pathExists").mockResolvedValue(false);
    lookupUuidByExportedFilename.mockResolvedValue(null);

    await handle(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.getHeader("Retry-After")).toBe("4");
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("streams file when cached", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { file: "20200101T010101000000Z-test.jpg" },
    });
    const res = httpMocks.createResponse();
    res.sendFile = jest.fn(() => res.status(200).end());
    jest.spyOn(fs, "pathExists").mockResolvedValue(true);

    await handle(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.getHeader("Cache-Control")).toBe(
      "public, max-age=31536000, immutable"
    );
    expect(res.getHeader("Content-Type")).toBe("image/jpeg");
  });
});

