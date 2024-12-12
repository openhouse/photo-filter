// backend/utils/helpers.js

export function getNestedProperty(obj, propertyPath) {
  if (!propertyPath || typeof propertyPath !== "string") {
    return null;
  }
  return propertyPath
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj
    );
}

export function formatPhotoDate(dateObj) {
  const YYYY = dateObj.getFullYear();
  const MM = String(dateObj.getMonth() + 1).padStart(2, "0");
  const DD = String(dateObj.getDate()).padStart(2, "0");
  const HH = String(dateObj.getHours()).padStart(2, "0");
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  const ss = String(dateObj.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

export function capitalizeAttributeName(attributeName) {
  const nameParts = attributeName.split(".");
  const lastPart = nameParts[nameParts.length - 1];
  return lastPart
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
