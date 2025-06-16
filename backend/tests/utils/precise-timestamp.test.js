// backend/tests/utils/precise-timestamp.test.js

import { formatPreciseTimestamp } from "../../../utils/precise-timestamp.js";

describe("formatPreciseTimestamp", () => {
  it("keeps existing micro-seconds", () => {
    const src = "2025-03-14 16:09:26.123456-04:00";
    expect(formatPreciseTimestamp(src)).toBe("20250314-160926123456");
  });

  it("pads when subseconds missing", () => {
    const src = "2022-11-05 08:17:09-05:00";
    expect(formatPreciseTimestamp(src)).toBe("20221105-081709000000");
  });

  it("handles Date instances", () => {
    const d = new Date("1999-12-31T23:59:59.999Z");
    expect(formatPreciseTimestamp(d)).toBe("19991231-235959999000");
  });
});
