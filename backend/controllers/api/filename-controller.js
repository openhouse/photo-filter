import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { createReadStream } from "node:fs";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray.js";
import { formatPreciseTimestamp } from "../../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILENAME_TO_ALBUM = new Map();
const ALBUM_PEOPLE_INDEX = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getPeopleByFilename(req, res) {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res
        .status(400)
        .json({ errors: [{ detail: "Filename is required" }] });
    }

    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsDir = path.join(dataDir, "albums");

    if (!(await fs.pathExists(albumsDir))) {
      return res.status(404).json({ errors: [{ detail: "Photo not found" }] });
    }

    let albumUUID = getCachedAlbumUUID(filename);
    if (!albumUUID) {
      albumUUID = await findAlbumUUIDByFilename(albumsDir, filename);
      if (!albumUUID) {
        return res
          .status(404)
          .json({ errors: [{ detail: "Photo not found" }] });
      }
      cacheAlbumUUID(filename, albumUUID);
    }

    let index = getAlbumIndex(albumUUID);
    if (!index) {
      const photosPath = path.join(albumsDir, albumUUID, "photos.json");
      index = await buildPeopleIndexStreaming(photosPath);
      setAlbumIndex(albumUUID, index);
    }

    if (!index.has(filename)) {
      return res.status(404).json({ errors: [{ detail: "Photo not found" }] });
    }

    const persons = index.get(filename) || [];
    return res.json({ data: persons });
  } catch (error) {
    console.error("Error looking up persons by filename:", error);
    return res
      .status(500)
      .json({ errors: [{ detail: "Internal Server Error" }] });
  }
}

function getCachedAlbumUUID(name) {
  const v = FILENAME_TO_ALBUM.get(name);
  if (v && Date.now() - v.ts < CACHE_TTL_MS) return v.uuid;
  if (v) FILENAME_TO_ALBUM.delete(name);
  return null;
}

function cacheAlbumUUID(name, uuid) {
  FILENAME_TO_ALBUM.set(name, { uuid, ts: Date.now() });
}

async function findAlbumUUIDByFilename(albumsDir, filename) {
  const entries = await fs.readdir(albumsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(albumsDir, entry.name, "images", filename);
    if (await fs.pathExists(candidate)) {
      return entry.name;
    }
  }
  return null;
}

function getAlbumIndex(albumUUID) {
  const v = ALBUM_PEOPLE_INDEX.get(albumUUID);
  if (v && Date.now() - v.ts < CACHE_TTL_MS) return v.map;
  if (v) ALBUM_PEOPLE_INDEX.delete(albumUUID);
  return null;
}

function setAlbumIndex(albumUUID, map) {
  ALBUM_PEOPLE_INDEX.set(albumUUID, { map, ts: Date.now() });
}

async function buildPeopleIndexStreaming(photosPath) {
  const index = new Map();
  if (!(await fs.pathExists(photosPath))) {
    return index;
  }

  const stream = createReadStream(photosPath)
    .pipe(parser())
    .pipe(streamArray());

  for await (const { value: photo } of stream) {
    if (!photo) continue;

    const exported = buildExportedName(photo);
    if (!exported) continue;

    const persons = extractPersons(photo);
    index.set(exported, persons);
  }

  return index;
}

function buildExportedName(photo) {
  try {
    const originalSource = photo.original_filename || photo.originalFilename;
    if (!originalSource) return null;
    const originalName = path.parse(originalSource).name;
    if (!originalName) return null;
    const rawDate = photo.date ?? photo.creation_date ?? photo.creationDate;
    if (!rawDate) return null;
    const timestamp = formatPreciseTimestamp(rawDate);
    return `${timestamp}-${originalName}.jpg`;
  } catch (err) {
    return null;
  }
}

function extractPersons(photo) {
  const people = new Set();
  if (Array.isArray(photo.persons)) {
    for (const name of photo.persons) {
      if (name) people.add(String(name));
    }
  }
  if (Array.isArray(photo.persons_full)) {
    for (const name of photo.persons_full) {
      if (name) people.add(String(name));
    }
  }
  if (Array.isArray(photo.face_names)) {
    for (const name of photo.face_names) {
      if (name) people.add(String(name));
    }
  }
  if (Array.isArray(photo.faceInfo)) {
    for (const info of photo.faceInfo) {
      if (info && info.name) people.add(String(info.name));
    }
  }
  if (Array.isArray(photo.labels)) {
    for (const label of photo.labels) {
      const value = label && typeof label === "object" ? label.name : label;
      if (value) people.add(String(value));
    }
  }
  return Array.from(people).sort((a, b) => a.localeCompare(b));
}
