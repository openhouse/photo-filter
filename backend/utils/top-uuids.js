import { getNestedProperty } from './helpers.js';

export function topUUIDsByAttributes(photos, attributes, n = 50) {
  const unique = new Set();
  for (const attr of attributes) {
    const scoreKey = `score.${attr}`;
    const sorted = [...photos].sort((a, b) => {
      const va = getNestedProperty(a, scoreKey);
      const vb = getNestedProperty(b, scoreKey);
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      return vb - va;
    });
    for (const photo of sorted.slice(0, n)) {
      unique.add(photo.uuid);
    }
  }
  return [...unique];
}
