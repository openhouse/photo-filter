import { jest } from "@jest/globals";
import httpMocks from "node-mocks-http";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { formatPreciseTimestamp } from "../../../utils/helpers.js";

const mockCreateReadStream = jest.fn();
const mockWithParser = jest.fn();

jest.unstable_mockModule("node:fs", () => ({
  createReadStream: mockCreateReadStream,
}));

jest.unstable_mockModule("stream-json/streamers/StreamArray.js", () => ({
  __esModule: true,
  default: {
    withParser: mockWithParser,
  },
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { getPeopleByFilename } = await import(
  "../../../controllers/api/filename-controller.js"
);

function createAsyncStream(items) {
  return {
    destroy: jest.fn(),
    async *[Symbol.asyncIterator]() {
      for (const value of items) {
        yield { value };
      }
    },
  };
}

describe("getPeopleByFilename", () => {
  let localRoot;

  beforeEach(() => {
    mockCreateReadStream.mockReset();
    mockWithParser.mockReset();
    localRoot = path.join(__dirname, "..", "..", "__tmp-local__");
    process.env.PF_LOCAL_ROOT = localRoot;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.PF_LOCAL_ROOT;
  });

  it("returns person names when photo is found", async () => {
    const date = "2025-05-30T23:35:13.160Z";
    const ts = formatPreciseTimestamp(date);
    const exported = `${ts}-_DSF7004.jpg`;

    const req = httpMocks.createRequest({ params: { filename: exported } });
    const res = httpMocks.createResponse();

    jest.spyOn(fs, "pathExists").mockImplementation(async (targetPath) => {
      if (targetPath === path.join(localRoot, "albums")) {
        return true;
      }
      if (targetPath.includes(path.join("images", exported))) {
        return true;
      }
      if (targetPath.endsWith(path.join("album1", "photos.json"))) {
        return true;
      }
      if (targetPath === path.join(localRoot, "library", exported)) {
        return true;
      }
      return false;
    });

    jest
      .spyOn(fs, "readdir")
      .mockResolvedValue([{ name: "album1", isDirectory: () => true }]);

    const streamItems = [
      {
        original_filename: "_DSF7004.jpg",
        date,
        persons: ["Alice", "Bob"],
      },
    ];

    const parserToken = {};
    mockWithParser.mockReturnValue(parserToken);
    const stream = createAsyncStream(streamItems);
    mockCreateReadStream.mockReturnValue({
      pipe(transform) {
        expect(transform).toBe(parserToken);
        return stream;
      },
    });

    await getPeopleByFilename(req, res);

    expect(res.statusCode).toBe(200);
    expect(["disk", "cache"]).toContain(res.getHeader("X-PF-Resolve"));
    const data = res._getJSONData();
    expect(data.data).toEqual(["Alice", "Bob"]);
    expect(stream.destroy).toHaveBeenCalled();
  });

  it("returns person names when found via photos.json fallback", async () => {
    const date = "2025-05-30T23:36:13.160Z";
    const ts = formatPreciseTimestamp(date);
    const exported = `${ts}-_DSF7004.jpg`;

    const req = httpMocks.createRequest({ params: { filename: exported } });
    const res = httpMocks.createResponse();

    jest.spyOn(fs, "pathExists").mockImplementation(async (targetPath) => {
      if (targetPath === path.join(localRoot, "albums")) {
        return true;
      }
      if (targetPath.includes(path.join("images", exported))) {
        return false;
      }
      if (targetPath.endsWith(path.join("album1", "photos.json"))) {
        return true;
      }
      if (targetPath === path.join(localRoot, "library", exported)) {
        return false;
      }
      return false;
    });

    jest
      .spyOn(fs, "readdir")
      .mockResolvedValue([{ name: "album1", isDirectory: () => true }]);

    const streamItems = [
      {
        original_filename: "_DSF7004.jpg",
        date,
        persons: ["Alice", "Bob"],
      },
    ];

    const parserToken = {};
    mockWithParser.mockReturnValue(parserToken);
    const stream = createAsyncStream(streamItems);
    mockCreateReadStream.mockReturnValue({
      pipe(transform) {
        expect(transform).toBe(parserToken);
        return stream;
      },
    });

    await getPeopleByFilename(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getHeader("X-PF-Resolve")).toBe("json");
    const data = res._getJSONData();
    expect(data.data).toEqual(["Alice", "Bob"]);
    expect(stream.destroy).toHaveBeenCalled();
  });

  it("supports the query variant", async () => {
    const date = "2025-05-30T23:35:13.160Z";
    const ts = formatPreciseTimestamp(date);
    const exported = `${ts}-_DSF7004.jpg`;

    const req = httpMocks.createRequest({ query: { filename: exported } });
    const res = httpMocks.createResponse();

    jest.spyOn(fs, "pathExists").mockImplementation(async (targetPath) => {
      if (targetPath === path.join(localRoot, "albums")) {
        return true;
      }
      if (targetPath.includes(path.join("images", exported))) {
        return true;
      }
      if (targetPath.endsWith(path.join("album1", "photos.json"))) {
        return true;
      }
      if (targetPath === path.join(localRoot, "library", exported)) {
        return true;
      }
      return false;
    });

    jest
      .spyOn(fs, "readdir")
      .mockResolvedValue([{ name: "album1", isDirectory: () => true }]);

    const streamItems = [
      {
        original_filename: "_DSF7004.jpg",
        date,
        persons: ["Alice", "Bob"],
      },
    ];

    const parserToken = {};
    mockWithParser.mockReturnValue(parserToken);
    const stream = createAsyncStream(streamItems);
    mockCreateReadStream.mockReturnValue({
      pipe(transform) {
        expect(transform).toBe(parserToken);
        return stream;
      },
    });

    await getPeopleByFilename(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getHeader("X-PF-Resolve")).toBe("disk");
    expect(res._getJSONData().data).toEqual(["Alice", "Bob"]);
  });

  it("returns 404 when no photo matches", async () => {
    const req = httpMocks.createRequest({ params: { filename: "notfound.jpg" } });
    const res = httpMocks.createResponse();

    jest.spyOn(fs, "pathExists").mockImplementation(async (targetPath) => {
      if (targetPath === path.join(localRoot, "albums")) {
        return true;
      }
      if (targetPath.endsWith(path.join("album1", "photos.json"))) {
        return true;
      }
      return false;
    });

    jest
      .spyOn(fs, "readdir")
      .mockResolvedValue([{ name: "album1", isDirectory: () => true }]);

    const parserToken = {};
    mockWithParser.mockReturnValue(parserToken);
    const stream = createAsyncStream([]);
    mockCreateReadStream.mockReturnValue({
      pipe(transform) {
        expect(transform).toBe(parserToken);
        return stream;
      },
    });

    await getPeopleByFilename(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.getHeader("X-PF-Resolve")).toBe("miss");
    expect(res.getHeader("X-PF-Miss-Reason")).toBe("json");
    expect(stream.destroy).toHaveBeenCalled();
  });

  it("rejects unsafe filenames", async () => {
    const req = httpMocks.createRequest({ params: { filename: "../evil.jpg" } });
    const res = httpMocks.createResponse();

    await getPeopleByFilename(req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().errors[0].detail).toBe("Invalid filename");
    expect(res.getHeader("X-PF-Resolve")).toBe("invalid");
  });
});
