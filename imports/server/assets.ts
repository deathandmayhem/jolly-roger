import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import express from "express";
import mime from "mime-types";
import { logger as defaultLogger } from "../Logger";
import BlobMappings from "../lib/models/BlobMappings";
import addRuntimeConfig from "./addRuntimeConfig";
import expressAsyncWrapper from "./expressAsyncWrapper";
import Blobs from "./models/Blobs";
import type { BlobType } from "./models/Blobs";
import UploadTokens from "./models/UploadTokens";
import onExit from "./onExit";

const logger = defaultLogger.child({ label: "assets" });

export const defaultAssets: Map<string, BlobType> = new Map();
export const defaultMappings: Map<string, string> = new Map();
// Changing this list? Make sure to update imports/client/components/SetupPage.tsx as well
const hashes = [
  "brand.png",
  "brand@2x.png",
  "hero.png",
  "hero@2x.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "apple-touch-icon.png",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "mstile-150x150.png",
  "safari-pinned-tab.svg",
].map(async (assetName) => {
  const assetPath = Assets.absoluteFilePath(`default-branding/${assetName}`)!;
  const data = await fs.readFile(assetPath);
  const id = crypto.createHash("sha256").update(data).digest("hex");
  const md5 = crypto.createHash("md5").update(data).digest("hex");
  const mimeType =
    mime.contentType(path.extname(assetPath)) || "application/octet-stream";

  defaultMappings.set(assetName, id);
  defaultAssets.set(id, {
    _id: id,
    value: data as Uint8Array<ArrayBuffer>,
    mimeType,
    md5,
    size: data.length,
  });
});

await Promise.all(hashes);

// Include blob mappings in the runtime config, for faster loading, in addition
// to publishing it (for live updates)
export const cachedDBMappings: Map<string, string> = new Map();
Meteor.startup(async () => {
  const observer = await BlobMappings.find().observeChangesAsync({
    added: (id, doc) => {
      cachedDBMappings.set(id, doc.blob!);
    },
    changed: (id, doc) => {
      if (doc.blob) {
        cachedDBMappings.set(id, doc.blob);
      }
    },
    removed: (id) => {
      cachedDBMappings.delete(id);
    },
  });
  onExit(() => observer.stop());
});

addRuntimeConfig(() => {
  return {
    blobMappings: Object.fromEntries(cachedDBMappings),
    defaultBlobMappings: Object.fromEntries(defaultMappings),
  };
});

// Keep the current set of assets in memory for faster access.
const dbAssets: Map<string, BlobType> = new Map();
Meteor.startup(async () => {
  const observer = await Blobs.find().observeAsync({
    added: (doc) => {
      dbAssets.set(doc._id, doc);
    },
    changed: (doc) => {
      dbAssets.set(doc._id, doc);
    },
    removed: (doc) => {
      dbAssets.delete(doc._id);
    },
  });
  onExit(() => observer.stop());
});

const app = express();

const router = express.Router();
router.get("/:asset", (req, res) => {
  check(req.params.asset, String);

  const blob =
    dbAssets.get(req.params.asset) ?? defaultAssets.get(req.params.asset);
  if (blob) {
    const buff = Buffer.from(blob.value);
    res.statusCode = 200;
    res.setHeader("ETag", blob.md5);
    res.setHeader("Content-Type", blob.mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buff);
    res.end();
    return;
  }

  // No match.
  logger.verbose("404 GET", req.params);
  res.status(404).send("Sorry, not found");
});

const UPLOAD_TOKEN_VALIDITY_MSEC = 60000; // 60 seconds
const UPLOAD_MAX_FILE_SIZE = 1048576; // 1 MiB
router.post(
  "/:uploadToken",
  expressAsyncWrapper(async (req, res, next) => {
    check(req.params.uploadToken, String);
    // Look up upload token.  If missing, or too old (>1m), reject with a 403.
    const uploadToken = await UploadTokens.findOneAsync(req.params.uploadToken);

    // Regardless of age, once a token is presented, we should remove it.
    await UploadTokens.removeAsync(req.params.uploadToken);

    const now = new Date().getTime();
    if (
      !uploadToken ||
      uploadToken.createdAt.getTime() + UPLOAD_TOKEN_VALIDITY_MSEC < now
    ) {
      logger.info("403 POST", req.params);
      res.status(403).send("Missing, invalid, or expired upload token");
      return;
    }

    // Let's read the uploaded body, which should be just the file contents as a
    // byte stream, no additional encoding.

    // Aggregate chunks as they stream in.
    const chunks: Buffer[] = [];
    let uploadSize = 0;
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      uploadSize += chunk.length;
      if (uploadSize > UPLOAD_MAX_FILE_SIZE) {
        req.destroy();
      }
    });

    // We need to call the final end callback in a fiber (via
    // Meteor.bindEnvironment) since we access Mongo stuff (Blobs) through
    // Meteor's collections.
    req.on(
      "end",
      Meteor.bindEnvironment(() => {
        void (async () => {
          try {
            // Concatenate chunks into a single buffer representing the entire file contents
            const contents = Buffer.concat(chunks);
            logger.info("200 POST", {
              uploadToken: req.params.uploadToken,
              asset: uploadToken.asset,
              size: contents.length,
            });

            // Compute md5 for eTag.
            const md5 = crypto.createHash("md5").update(contents).digest("hex");
            // Compute sha256, which is the _id of the Blob
            const sha256 = crypto
              .createHash("sha256")
              .update(contents)
              .digest("hex");
            // Insert the Blob
            await Blobs.upsertAsync(
              { _id: sha256 },
              {
                $set: {
                  value: contents,
                  mimeType: uploadToken.mimeType,
                  md5,
                  size: contents.length,
                },
              },
            );
            // Save the mapping from asset name to the Blob we just inserted.
            await BlobMappings.upsertAsync(
              { _id: uploadToken.asset },
              {
                $set: {
                  blob: sha256,
                },
              },
            );
            res.status(200).send("Upload completed.");
            res.end();
          } catch (err) {
            next(err);
          }
        })();
      }),
    );
  }),
);

app.use("/", router);

WebApp.handlers.use("/asset", Meteor.bindEnvironment(app));
