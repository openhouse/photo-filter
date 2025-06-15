// helper/deviceName.js
export function normaliseDevice(raw) {
  if (!raw) return null;
  // Apple devices -------------------------------------------------
  const mApple = raw.match(/iPhone (\d+(?: Pro| Pro Max| mini|))?/i);
  if (mApple) return `Apple ${mApple[0]}`.replace(/\s+/g, " ").trim();

  // Google Pixel --------------------------------------------------
  const mPixel = raw.match(/Pixel (\d+)/i);
  if (mPixel) return `Google Pixel ${mPixel[1]}`;

  return null; // let caller fall back to heuristic / Unknown
}
