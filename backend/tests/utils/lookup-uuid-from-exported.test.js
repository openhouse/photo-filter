import fs from "fs-extra";
import os from "os";
import path from "path";

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "idx-"));
const indexPath = path.join(tmpDir, "filename-index.json");
process.env.LIB_INDEX_PATH = indexPath;

const {
  lookupUuidByExportedFilename,
  reloadIndexCache,
} = await import("../../utils/lookup-uuid-from-exported.js");

describe("lookupUuidByExportedFilename", () => {
  afterAll(async () => {
    delete process.env.LIB_INDEX_PATH;
    await fs.remove(tmpDir);
  });

  it("reloads index on change", async () => {
    const fname = "20200101T010101000000Z-test.jpg";
    await fs.writeJson(indexPath, { [fname]: "uuid1" });
    await reloadIndexCache();
    let val = await lookupUuidByExportedFilename(fname);
    expect(val).toBe("uuid1");

    await fs.writeJson(indexPath, { [fname]: "uuid2" });
    await reloadIndexCache();
    val = await lookupUuidByExportedFilename(fname);
    expect(val).toBe("uuid2");
  });
});

