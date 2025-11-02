import express from "express";
import fs from "fs-extra";
import os from "os";
import path from "path";
import request from "supertest";
import { jest } from "@jest/globals";
import { createImagesMiddleware } from "../../middleware/images.js";

describe("images middleware", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pf-images-"));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.remove(tmpDir);
    }
  });

  function buildApp() {
    const app = express();
    app.set("etag", "strong");
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    app.get(
      "/images/:albumUUID/:imageName",
      createImagesMiddleware({
        getImagesDir: (albumUUID) => path.join(tmpDir, albumUUID),
        logger,
      }),
    );
    return { app, logger };
  }

  test("rejects traversal attempts", async () => {
    const { app } = buildApp();

    const res = await request(app).get(
      "/images/ALBUM/..%2F..%2Fetc%2Fpasswd",
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid path" });
  });

  test("serves fallback matches", async () => {
    const albumDir = path.join(tmpDir, "ALBUM1");
    await fs.ensureDir(albumDir);
    const exported = "20240101T010203000000Z-My Photo (1).jpg";
    await fs.writeFile(path.join(albumDir, exported), "image-bytes");

    const { app, logger } = buildApp();

    const res = await request(app)
      .get("/images/ALBUM1/20240101T010203000000Z-My%20Photo.jpg")
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toContain("immutable");
    expect(res.headers).toHaveProperty("etag");
    expect(res.body.toString()).toBe("image-bytes");
    expect(logger.info).toHaveBeenCalledWith(
      "images: using fallback filename match",
      {
        albumUUID: "ALBUM1",
        requested: "20240101T010203000000Z-My Photo.jpg",
        resolved: "20240101T010203000000Z-My Photo (1).jpg",
      },
    );
  });
});
