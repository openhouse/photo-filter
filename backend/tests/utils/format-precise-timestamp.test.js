import { formatPreciseTimestamp } from "../../utils/precise-timestamp.js";

describe("formatPreciseTimestamp", () => {
  it("handles timezone offsets with seconds", () => {
    const input = "1904-01-01 01:00:00+00:09:21";
    const ts = formatPreciseTimestamp(input);
    expect(ts).toBe("19040101T005039000000Z");
  });
});
