import fs from "fs-extra";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";
import { ensureLegacySymlink } from "../../utils/symlinks.js";

describe("ensureLegacySymlink", () => {
  let tmpDir;
  let originalSkip;

  beforeEach(async () => {
    originalSkip = process.env.PF_SKIP_LEGACY_SYMLINK;
    process.env.PF_SKIP_LEGACY_SYMLINK = "0";
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pf-symlink-"));
  });

  afterEach(async () => {
    process.env.PF_SKIP_LEGACY_SYMLINK = originalSkip;
    if (tmpDir) {
      await fs.remove(tmpDir);
    }
  });

  test("creates a symlink when missing", async () => {
    const target = path.join(tmpDir, "images");
    const link = path.join(tmpDir, "legacy", "images");
    await fs.ensureDir(target);

    const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };
    await ensureLegacySymlink(target, link, { logger });

    const stat = await fs.lstat(link);
    expect(stat.isSymbolicLink()).toBe(true);
    const resolved = await fs.readlink(link);
    expect(path.resolve(path.dirname(link), resolved)).toBe(path.resolve(target));
  });

  test("keeps existing non-symlink untouched", async () => {
    const target = path.join(tmpDir, "images");
    const link = path.join(tmpDir, "legacy");
    await fs.ensureDir(target);
    await fs.ensureDir(link);

    const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };
    await ensureLegacySymlink(target, link, { logger });

    const stat = await fs.lstat(link);
    expect(stat.isDirectory()).toBe(true);
  });
});
