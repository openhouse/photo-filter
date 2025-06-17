// backend/utils/helpers.js
//
// Shared one-liners.  We re-export `formatPreciseTimestamp` so callers
// can keep a single import path for most utilities.

import { formatPreciseTimestamp } from "./precise-timestamp.js";

export { formatPreciseTimestamp };

export function getNestedProperty(obj, propertyPath) {
  if (!propertyPath || typeof propertyPath !== "string") return null;
  return propertyPath
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj
    );
}

export function capitalizeAttributeName(attributeName) {
  const bits = attributeName.split(".");
  const last = bits[bits.length - 1];
  return last
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// …other re‑exports remain
export { utcTimestampForFile } from "./precise-timestamp.js";
// export { renameWithUtcPrefix } from "./export-images.js";
