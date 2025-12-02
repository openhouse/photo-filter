// backend/controllers/api/albums-controller.js

import path from "path";
import fs from "fs-extra";
import { Serializer } from "jsonapi-serializer";
import {
  albumsPaths,
  ensureAlbumsExported,
  EXPORT_RETRY_AFTER_SECONDS,
  isTransientJsonError,
  readExportStatus,
  readJsonWithRetry,
} from "../../utils/albums-store.js";
import { slugifyName } from "../../utils/slugify-name.js";

const PersonSerializer = new Serializer("person", {
  id: "id",
  attributes: ["name"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

const AlbumSerializer = new Serializer("album", {
  id: "uuid",
  attributes: ["title"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
  relationships: {
    persons: {
      type: "person",
    },
  },
});

export const getAlbumsData = async (req, res) => {
  let exportStatus = null;
  try {
    await ensureAlbumsExported();
    exportStatus = await readExportStatus();

    const albumsData = await readJsonWithRetry(albumsPaths.albumsPath);

    if (exportStatus?.status) {
      res.set("X-PF-Export-Status", exportStatus.status);
    } else {
      res.set("X-PF-Export-Status", "ready");
    }
    if (exportStatus?.startedAt) {
      res.set("X-PF-Export-Started-At", exportStatus.startedAt);
    }
    if (exportStatus?.finishedAt) {
      res.set("X-PF-Export-Finished-At", exportStatus.finishedAt);
    }

    const jsonApiData = AlbumSerializer.serialize(albumsData);
    res.json(jsonApiData);
  } catch (error) {
    if (!exportStatus) {
      exportStatus = await readExportStatus().catch(() => null);
    }

    if (exportStatus?.status) {
      res.set("X-PF-Export-Status", exportStatus.status);
      if (exportStatus.startedAt) {
        res.set("X-PF-Export-Started-At", exportStatus.startedAt);
      }
      if (exportStatus.finishedAt) {
        res.set("X-PF-Export-Finished-At", exportStatus.finishedAt);
      }
    }

    if (isTransientJsonError(error)) {
      res
        .status(503)
        .set("Retry-After", EXPORT_RETRY_AFTER_SECONDS.toString())
        .set("X-PF-Exporting", "1");
      if (!res.getHeader("X-PF-Export-Status")) {
        res.set("X-PF-Export-Status", "running");
      }
      res.json({
        errors: [
          {
            detail: "Albums export in progress. Please retry shortly.",
          },
        ],
      });
      return;
    }

    console.error("Error fetching albums:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

export const getAlbumById = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    await ensureAlbumsExported();

    const dataDir = albumsPaths.dataDir;
    const albumsPath = albumsPaths.albumsPath;
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");

    const exportStatus = await readExportStatus();
    if (exportStatus?.status) {
      res.set("X-PF-Export-Status", exportStatus.status);
    } else {
      res.set("X-PF-Export-Status", "ready");
    }
    if (exportStatus?.startedAt) {
      res.set("X-PF-Export-Started-At", exportStatus.startedAt);
    }
    if (exportStatus?.finishedAt) {
      res.set("X-PF-Export-Finished-At", exportStatus.finishedAt);
    }

    const albumsData = await readJsonWithRetry(albumsPath);
    const album = albumsData.find((a) => a.uuid === albumUUID);

    if (!album) {
      return res.status(404).json({ errors: [{ detail: "Album not found" }] });
    }

    let persons = [];
    if (await fs.pathExists(photosPath)) {
      const photosData = await fs.readJson(photosPath);
      const allPersons = new Set();
      photosData.forEach((photo) => {
        if (Array.isArray(photo.persons)) {
          photo.persons.forEach((name) => allPersons.add(name));
        }
      });
      persons = Array.from(allPersons).map((name) => {
        return {
          id: slugifyName(name),
          name: name,
        };
      });
    }

    const albumRecord = {
      uuid: album.uuid,
      title: album.title,
    };

    let albumJsonApi = AlbumSerializer.serialize(albumRecord);
    albumJsonApi.data.relationships = albumJsonApi.data.relationships || {};
    albumJsonApi.data.relationships.persons = {
      data: persons.map((p) => ({ type: "person", id: p.id })),
    };

    const personJsonApi = PersonSerializer.serialize(persons);

    const merged = {
      data: albumJsonApi.data,
      included: personJsonApi.data,
      meta: {},
    };

    res.json(merged);
  } catch (error) {
    if (isTransientJsonError(error)) {
      res
        .status(503)
        .set("Retry-After", EXPORT_RETRY_AFTER_SECONDS.toString())
        .set("X-PF-Exporting", "1")
        .set("X-PF-Export-Status", "running")
        .json({
          errors: [
            {
              detail: "Albums export in progress. Please retry shortly.",
            },
          ],
        });
      return;
    }

    console.error("Error fetching album:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};
