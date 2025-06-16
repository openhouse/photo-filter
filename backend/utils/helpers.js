// backend/utils/helpers.js
//
// Small shared utils; re-exports the precise timestamp helper
// to keep older imports working should they be updated later.
//

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
  const nameParts = attributeName.split(".");
  const lastPart = nameParts[nameParts.length - 1];
  return lastPart
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
