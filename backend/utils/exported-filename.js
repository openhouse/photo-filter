import path from "path";
import { formatPreciseTimestamp } from "./helpers.js";

const EXPORTED_NAME_REGEX =
  /^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})T(?<hour>\d{2})(?<minute>\d{2})(?<second>\d{2})(?<microsecond>\d{6})Z-/;
const SUPPORTED_DIRECTIVES = new Map(
  Object.entries({
    "%Y": "year",
    "%m": "month",
    "%d": "day",
    "%H": "hour",
    "%M": "minute",
    "%S": "second",
    "%f": "microsecond",
    "%j": "dayOfYear",
  }),
);

export function buildExportedFilename(photo) {
  if (!photo) return null;
  const originalSource =
    photo.original_filename || photo.originalFilename || photo.originalName;
  if (!originalSource) return null;
  const originalName = path.parse(originalSource).name;
  if (!originalName) return null;

  const rawDate = photo.date ?? photo.creation_date ?? photo.creationDate;
  if (!rawDate) return null;

  const timestamp = formatPreciseTimestamp(rawDate);
  if (!timestamp) return null;

  return `${timestamp}-${originalName}.jpg`;
}

export function parseExportedTimestamp(exportedName) {
  if (typeof exportedName !== "string") return null;
  const match = exportedName.match(EXPORTED_NAME_REGEX);
  if (!match?.groups) return null;
  let dayOfYear = null;
  try {
    const iso = `${match.groups.year}-${match.groups.month}-${match.groups.day}T${match.groups.hour}:${match.groups.minute}:${match.groups.second}.${match.groups.microsecond}Z`;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      const start = Date.UTC(Number(match.groups.year), 0, 1);
      const diff = date.getTime() - start;
      const ordinal = Math.floor(diff / 86_400_000) + 1;
      dayOfYear = ordinal.toString().padStart(3, "0");
    }
  } catch {
    dayOfYear = null;
  }

  return {
    year: match.groups.year,
    month: match.groups.month,
    day: match.groups.day,
    hour: match.groups.hour,
    minute: match.groups.minute,
    second: match.groups.second,
    microsecond: match.groups.microsecond,
    dayOfYear,
  };
}

export function extractStrftimeTemplate(template) {
  if (!template) return null;
  const trimmed = template.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\{[^}]*strftime,([^}]+)}/i);
  if (match) {
    return match[1];
  }
  return trimmed;
}

export function libraryRelativePath(exportedName, template) {
  const parts = parseExportedTimestamp(exportedName);
  if (!parts) return null;

  const strftime = extractStrftimeTemplate(template) ?? "%Y/%m/%d";
  const replaced = strftime.replace(/%[YmdHMSfj]/g, (directive) => {
    const key = SUPPORTED_DIRECTIVES.get(directive);
    const value = key ? parts[key] : null;
    return value ?? directive;
  });

  const segments = replaced
    .split(/[\\/]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return path.join(parts.year, parts.month, parts.day);
  }
  return path.join(...segments);
}
