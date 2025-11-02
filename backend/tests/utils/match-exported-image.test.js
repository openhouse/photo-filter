import { findExportedImageMatch } from "../../utils/match-exported-image.js";

describe("findExportedImageMatch", () => {
  it("returns null when there is no dash in requested name", () => {
    expect(findExportedImageMatch(["foo.jpg"], "foo.jpg")).toBeNull();
  });

  it("matches identical filenames", () => {
    const files = ["20220101T010101000000Z-IMG_0001.jpg"];
    expect(
      findExportedImageMatch(files, "20220101T010101000000Z-IMG_0001.jpg"),
    ).toBe("20220101T010101000000Z-IMG_0001.jpg");
  });

  it("matches when candidate has appended suffix", () => {
    const files = [
      "20220101T010101000000Z-IMG_0001 (1).jpg",
      "20220101T010101000000Z-IMG_0002.jpg",
    ];
    expect(
      findExportedImageMatch(files, "20220101T010101000000Z-IMG_0001.jpg"),
    ).toBe("20220101T010101000000Z-IMG_0001 (1).jpg");
  });

  it("matches when requested has suffix and disk version is base", () => {
    const files = ["20220101T010101000000Z-IMG_0001.jpg"];
    expect(
      findExportedImageMatch(
        files,
        "20220101T010101000000Z-IMG_0001 (1).jpg",
      ),
    ).toBe("20220101T010101000000Z-IMG_0001.jpg");
  });
});
