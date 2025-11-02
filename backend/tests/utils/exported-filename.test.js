import path from "path";
import {
  buildExportedFilename,
  parseExportedTimestamp,
  libraryRelativePath,
} from "../../utils/exported-filename.js";
import {
  getLibraryPathForExportedName,
  getLibraryDirTemplate,
} from "../../config/storage-paths.js";

describe("exported filename helpers", () => {
  afterEach(() => {
    delete process.env.PF_LIBRARY_DIR_TEMPLATE;
    delete process.env.PF_LIBRARY_ROOT;
  });

  it("builds filenames with microsecond precision", () => {
    const photo = {
      original_filename: "IMG_0001.HEIC",
      date: "2024-02-20T18:42:33.123Z",
    };
    const exported = buildExportedFilename(photo);
    expect(exported).toBe("20240220T184233123000Z-IMG_0001.jpg");
    const parts = parseExportedTimestamp(exported);
    expect(parts).toMatchObject({
      year: "2024",
      month: "02",
      day: "20",
      hour: "18",
      minute: "42",
      second: "33",
      microsecond: "123000",
    });
  });

  it("derives library directories from templates", () => {
    const exported = "20240220T184233123000Z-IMG_0001.jpg";
    const relative = libraryRelativePath(exported, "{created.utc.strftime,%Y/%m/%d}");
    expect(relative).toBe(path.join("2024", "02", "20"));

    const customRelative = libraryRelativePath(
      exported,
      "{created.utc.strftime,%Y/%m/pf-%d}",
    );
    expect(customRelative).toBe(path.join("2024", "02", "pf-20"));
  });

  it("aligns library paths with configured template", () => {
    process.env.PF_LIBRARY_ROOT = "/tmp/photo-filter-library";
    process.env.PF_LIBRARY_DIR_TEMPLATE = "{created.utc.strftime,%Y/%j}";
    const exported = "20240220T184233123000Z-IMG_0001.jpg";
    const libraryPath = getLibraryPathForExportedName(exported);
    expect(libraryPath).toBe(
      path.join("/tmp/photo-filter-library", "2024", "051", exported),
    );
    expect(getLibraryDirTemplate()).toBe("{created.utc.strftime,%Y/%j}");
  });
});
