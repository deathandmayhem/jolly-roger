/* eslint-disable no-console */
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import express from 'express';
import mime from 'mime-types';
import BlobMappings from '../lib/models/BlobMappings';
import Blobs from './models/Blobs';
import UploadTokens from './models/UploadTokens';
import onExit from './onExit';
import { BlobType } from './schemas/Blob';

// Meteor has no way to import Assets under ES6 modules; it's just always a
// global that all server code can access.
declare global {
  const Assets: {
    absoluteFilePath(assetPath: string): string | undefined;
  };
}

// eslint-disable-next-line import/prefer-default-export
export const defaultAssets: Map<string, BlobType> = new Map();
export const defaultMappings: Map<string, string> = new Map();
// Changing this list? Make sure to update imports/client/components/SetupPage.tsx as well
const hashes = [
  'brand.png',
  'brand@2x.png',
  'hero.png',
  'hero@2x.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'apple-touch-icon.png',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'mstile-150x150.png',
  'safari-pinned-tab.svg',
].map(async (assetName) => {
  const assetPath = Assets.absoluteFilePath(`default-branding/${assetName}`)!;
  const data = await fs.readFile(assetPath);
  const id = crypto.createHash('sha256').update(data).digest('hex');
  const md5 = crypto.createHash('md5').update(data).digest('hex');
  const mimeType = mime.contentType(path.extname(assetPath)) || 'application/octet-stream';

  defaultMappings.set(assetName, id);
  defaultAssets.set(id, {
    _id: id,
    value: data,
    mimeType,
    md5,
    size: data.length,
  });
});

await Promise.all(hashes);

// Include blob mappings in the runtime config, for faster loading, in addition
// to publishing it (for live updates)
export const cachedDBMappings: Map<string, string> = new Map();
Meteor.startup(() => {
  const observer = BlobMappings.find().observeChanges({
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

Meteor.publish('mongo.blob_mappings', () => {
  return BlobMappings.find({});
});

interface JollyRogerRuntimeConfig {
  blobMappings: Record<string, string>;
  defaultBlobMappings: Record<string, string>;
}

WebApp.addRuntimeConfigHook(({ encodedCurrentConfig }) => {
  const config = WebApp.decodeRuntimeConfig(encodedCurrentConfig) as JollyRogerRuntimeConfig;
  config.blobMappings = Object.fromEntries(cachedDBMappings);
  config.defaultBlobMappings = Object.fromEntries(defaultMappings);
  return WebApp.encodeRuntimeConfig(config);
});

// Keep the current set of assets in memory for faster access.
const dbAssets: Map<string, BlobType> = new Map();
Meteor.startup(() => {
  const observer = Blobs.find().observe({
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

// eslint-disable-next-line new-cap
const router = express.Router();
router.get('/:asset', (req, res) => {
  check(req.params.asset, String);

  const blob = dbAssets.get(req.params.asset) ?? defaultAssets.get(req.params.asset);
  if (blob) {
    const buff = Buffer.from(blob.value);
    res.statusCode = 200;
    res.setHeader('ETag', blob.md5);
    res.setHeader('Content-Type', blob.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buff);
    res.end();
    return;
  }

  // No match.
  console.log(`[assets] 404 GET ${req.params.asset}`);
  res.status(404).send('Sorry, not found');
});

const UPLOAD_TOKEN_VALIDITY_MSEC = 60000; // 60 seconds
const UPLOAD_MAX_FILE_SIZE = 1048576; // 1 MiB
router.post('/:uploadToken', async (req, res) => {
  check(req.params.uploadToken, String);
  // Look up upload token.  If missing, or too old (>1m), reject with a 403.
  const uploadToken = await UploadTokens.findOneAsync(req.params.uploadToken);

  // Regardless of age, once a token is presented, we should remove it.
  await UploadTokens.removeAsync(req.params.uploadToken);

  const now = new Date().getTime();
  if (!uploadToken || uploadToken.createdAt.getTime() + UPLOAD_TOKEN_VALIDITY_MSEC < now) {
    console.log(`[assets] 403 POST ${req.params.uploadToken}`);
    res.status(403).send('Missing, invalid, or expired upload token');
    return;
  }

  // Let's read the uploaded body, which should be just the file contents as a
  // byte stream, no additional encoding.

  // Aggregate chunks as they stream in.
  const chunks: Buffer[] = [];
  let uploadSize = 0;
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
    uploadSize += chunk.length;
    if (uploadSize > UPLOAD_MAX_FILE_SIZE) {
      req.destroy();
    }
  });

  // We need to call the final end callback in a fiber (via
  // Meteor.bindEnvironment) since we access Mongo stuff (Blobs) through
  // Meteor's collections.
  req.on('end', Meteor.bindEnvironment(async () => {
    // Concatenate chunks into a single buffer representing the entire file contents
    const contents = Buffer.concat(chunks);
    console.log(`[assets] 200 POST ${req.params.uploadToken} ${uploadToken.asset} ${contents.length} bytes`);

    // Compute md5 for eTag.
    const md5 = crypto.createHash('md5').update(contents).digest('hex');
    // Compute sha256, which is the _id of the Blob
    const sha256 = crypto.createHash('sha256').update(contents).digest('hex');
    // Insert the Blob
    await Blobs.upsertAsync({ _id: sha256 }, {
      $set: {
        value: contents,
        mimeType: uploadToken.mimeType,
        md5,
        size: contents.length,
      },
    });
    // Save the mapping from asset name to the Blob we just inserted.
    await BlobMappings.upsertAsync({ _id: uploadToken.asset }, {
      $set: {
        blob: sha256,
      },
    });
    res.status(200).send('Upload completed.');
    res.end();
  }));
});

app.use('/', router);

WebApp.connectHandlers.use('/asset', Meteor.bindEnvironment(app));
