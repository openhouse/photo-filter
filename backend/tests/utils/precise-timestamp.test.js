import { utcTimestampForFile } from "../../backend/utils/precise-timestamp.js";
import { exiftool } from "exiftool-vendored";

// Mock exiftool.read so we don’t hit the binary during CI
jest.mock("exiftool-vendored", () => {
  return {
    exiftool: {
      read: jest.fn(),
    },
  };
});

describe("utcTimestampForFile", () => {
  it("handles OffsetTimeOriginal with sub‑seconds", async () => {
    exiftool.read.mockResolvedValue({
      DateTimeOriginal: "2025:05:31 13:45:41",
      SubSecTimeOriginal: "540000",
      OffsetTimeOriginal: "-06:00",
    });

    const ts = await utcTimestampForFile("/dummy.jpg");
    expect(ts).toBe("20250531T194541540000Z"); // 13:45‑06 → 19:45Z
  });

  it("falls back to CreateDate & local zone when no offset", async () => {
    // pretend local tz is UTC‑4
    process.env.TZ = "America/New_York";

    exiftool.read.mockResolvedValue({
      CreateDate: "2025:01:02 03:04:05",
      SubSecTime: "1",
    });

    const ts = await utcTimestampForFile("/dummy.jpg");
    expect(ts.startsWith("20250102T070405")).toBe(true); // 03:04 EDT + 4 h
    expect(ts.endsWith("000001Z")).toBe(true);
  });
});
