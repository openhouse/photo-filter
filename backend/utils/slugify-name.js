// ./utils/slugify-name.js

/**
 * Generate a URL-safe, stable slug for a person's name.
 */
export function slugifyName(name) {
  const base = String(name ?? "").normalize("NFKD");
  const withoutDiacritics = base.replace(/[\u0300-\u036f]/g, "");

  const slug = withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "person";
}
