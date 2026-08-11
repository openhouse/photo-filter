import { createReadStream } from "node:fs";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import {
  buildPeopleSnapshot,
  createPeopleIndexService,
  lookupPeopleInSnapshot,
} from "../../services/people-index.js";
import { resolvePhotoBasename } from "../../controllers/api/filename-controller.js";

async function writeSource(root, relativePath, photos) {
  const absolutePath = path.join(root, relativePath);
  await fs.ensureDir(path.dirname(absolutePath));
  await fs.writeJson(absolutePath, photos, { spaces: 2 });
  return {
    albumUUID: relativePath.split(path.sep)[1] ?? "library",
    relativePath: relativePath.split(path.sep).join("/"),
    absolutePath,
  };
}

describe("content-addressed people index", () => {
  let root;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pf-people-index-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it("prefers timestamped semantic identity over a generic metadata filename", () => {
    expect(
      resolvePhotoBasename({
        filename: "DSCF1000.RAF",
        original_filename: "DSCF1000.RAF",
        date: "2026-05-19T23:55:19.000000Z",
      }),
    ).toMatchObject({
      filename: "20260519T235519000000Z-DSCF1000.jpg",
    });
  });

  it("fails loudly instead of publishing a valid-looking empty snapshot", async () => {
    const service = createPeopleIndexService({ listSources: async () => [] });

    await expect(service.resolve(["photo.jpg"])).rejects.toMatchObject({
      code: "PEOPLE_INDEX_NO_SOURCES",
      statusCode: 503,
    });
  });

  it("hashes source paths and exact bytes deterministically", async () => {
    const a = await writeSource(root, "albums/a/photos.json", [
      {
        file_basename: "20260101T000000000000Z-A.jpg",
        original_filename: "A.jpg",
        persons: ["Alice"],
      },
    ]);
    const b = await writeSource(root, "albums/b/photos.json", [
      {
        file_basename: "20260101T000001000000Z-B.jpg",
        original_filename: "B.jpg",
        persons: ["Bob"],
      },
    ]);

    const first = await buildPeopleSnapshot([b, a]);
    const reordered = await buildPeopleSnapshot([a, b]);
    expect(reordered.corpusSha256).toBe(first.corpusSha256);

    await fs.appendFile(a.absolutePath, "\n");
    const byteChanged = await buildPeopleSnapshot([a, b]);
    expect(byteChanged.corpusSha256).not.toBe(first.corpusSha256);

    const renamed = {
      ...b,
      relativePath: "albums/c/photos.json",
    };
    const pathChanged = await buildPeopleSnapshot([a, renamed]);
    expect(pathChanged.corpusSha256).not.toBe(byteChanged.corpusSha256);
  });

  it("opens each source once for a 500-filename lookup", async () => {
    const photos = Array.from({ length: 500 }, (_, index) => ({
      file_basename: `20260101T000000${String(index).padStart(6, "0")}Z-P${index}.jpg`,
      original_filename: `P${index}.jpg`,
      persons: [`Person ${index}`],
    }));
    const source = await writeSource(root, "albums/a/photos.json", photos);
    let opens = 0;
    const snapshot = await buildPeopleSnapshot([source], {
      openSource(absolutePath) {
        opens += 1;
        return createReadStream(absolutePath);
      },
    });

    const results = photos.map((photo) =>
      lookupPeopleInSnapshot(snapshot, photo.file_basename),
    );
    expect(opens).toBe(1);
    expect(results).toHaveLength(500);
    expect(results.every((result) => result.status === "exact")).toBe(true);
    expect(results[499].people).toEqual(["Person 499"]);
  });

  it("prefers exact exported names and resolves only unique semantic aliases", async () => {
    const source = await writeSource(root, "albums/a/photos.json", [
      {
        file_basename: "20260101T000000000000Z-PORTRAIT.jpg",
        original_filename: "PORTRAIT.jpg",
        persons: ["Alice", "Alice"],
      },
      {
        file_basename: "20260102T000000000000Z-PORTRAIT.jpg",
        original_filename: "PORTRAIT.jpg",
        persons: ["Bob"],
      },
      {
        file_basename: "20260103T000000000000Z-UNIQUE.jpg",
        original_filename: "UNIQUE.jpg",
        face_names: ["Carol"],
      },
    ]);
    const snapshot = await buildPeopleSnapshot([source]);

    expect(
      lookupPeopleInSnapshot(
        snapshot,
        "20260101T000000000000Z-PORTRAIT.jpg",
      ),
    ).toMatchObject({ status: "exact", people: ["Alice"] });
    expect(
      lookupPeopleInSnapshot(snapshot, "20990101T000000000000Z-UNIQUE.jpg"),
    ).toMatchObject({
      status: "alias",
      resolvedFilename: "20260103T000000000000Z-UNIQUE.jpg",
      people: ["Carol"],
    });
    expect(
      lookupPeopleInSnapshot(snapshot, "20990101T000000000000Z-PORTRAIT.jpg"),
    ).toMatchObject({ status: "ambiguous", people: [] });
    expect(lookupPeopleInSnapshot(snapshot, "../bad.jpg")).toMatchObject({
      status: "invalid",
      people: [],
    });
  });

  it("keeps the previous complete snapshot when a refresh fails", async () => {
    const source = await writeSource(root, "albums/a/photos.json", [
      {
        file_basename: "20260101T000000000000Z-A.jpg",
        original_filename: "A.jpg",
        persons: ["Alice"],
      },
    ]);
    const service = createPeopleIndexService({
      listSources: async () => [source],
    });

    const initial = await service.resolve(
      ["20260101T000000000000Z-A.jpg"],
      { refresh: "verify" },
    );
    await fs.writeFile(source.absolutePath, "not json", "utf8");

    await expect(service.refresh({ mode: "force" })).rejects.toThrow();
    expect(service.status().corpusSha256).toBe(initial.meta.corpusSha256);
    expect(service.status().lastRefreshError).toBeTruthy();
  });

  it("coalesces concurrent refreshes and rejects unknown refresh modes", async () => {
    const source = await writeSource(root, "albums/a/photos.json", []);
    let builds = 0;
    const service = createPeopleIndexService({
      listSources: async () => [source],
      async buildSnapshot(sources) {
        builds += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return buildPeopleSnapshot(sources);
      },
    });

    await Promise.all([
      service.refresh({ mode: "verify" }),
      service.refresh({ mode: "verify" }),
    ]);
    expect(builds).toBe(1);
    await expect(
      service.resolve([], { refresh: "unexpected" }),
    ).rejects.toMatchObject({ code: "INVALID_REFRESH_MODE" });
  });

  it("deduplicates album memberships by semantic photo identity", async () => {
    const repeatedPhoto = {
      original_filename: "DSCF1000.RAF",
      date: "2026-05-19T23:55:19.000000Z",
      persons: ["Alice"],
    };
    const a = await writeSource(root, "albums/a/photos.json", [repeatedPhoto]);
    const b = await writeSource(root, "albums/b/photos.json", [
      { ...repeatedPhoto, persons: ["Bob"] },
    ]);
    const snapshot = await buildPeopleSnapshot([a, b]);

    expect(
      lookupPeopleInSnapshot(
        snapshot,
        "20260519T235519000000Z-DSCF1000.jpg",
      ),
    ).toMatchObject({ status: "exact", people: ["Alice", "Bob"] });
    expect(
      lookupPeopleInSnapshot(
        snapshot,
        "20990101T000000000000Z-DSCF1000.jpg",
      ),
    ).toMatchObject({ status: "alias", people: ["Alice", "Bob"] });

    const c = await writeSource(root, "albums/c/photos.json", [
      {
        ...repeatedPhoto,
        date: "2026-05-20T23:55:19.000000Z",
        persons: ["Bob"],
      },
    ]);
    const withDifferentPhoto = await buildPeopleSnapshot([a, b, c]);
    expect(
      lookupPeopleInSnapshot(
        withDifferentPhoto,
        "20990101T000000000000Z-DSCF1000.jpg",
      ),
    ).toMatchObject({ status: "ambiguous", people: [] });
  });
});
