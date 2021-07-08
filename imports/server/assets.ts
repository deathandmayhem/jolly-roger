import crypto from 'crypto';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
/* global Assets */
import express from 'express';
import mime from 'mime-types';
import BlobMappings from '../lib/models/blob_mappings';
import Blobs from './models/blobs';
import UploadTokens from './models/upload_tokens';

/* eslint-disable no-console */

// Meteor has no way to import Assets under ES6 modules; it's just always a
// global that all server code can access.
declare global {
  const Assets: any;
}

const app = express();

// eslint-disable-next-line new-cap
const router = express.Router();
router.get('/:asset', (req, res) => {
  check(req.params.asset, String);

  // First: see if there's an blob with this name in the DB
  const maybeBlob = Blobs.findOne(req.params.asset);
  if (maybeBlob) {
    // If so, deserialize it and return it
    const buff = Buffer.from(maybeBlob.value);
    res.statusCode = 200;
    res.setHeader('ETag', maybeBlob.md5);
    res.setHeader('Content-Type', maybeBlob.mimeType);
    res.send(buff);
    res.end();
    return;
  }

  // Next: see if there's a packaged asset with this name in the DB
  let packagedAsset;
  try {
    packagedAsset = Assets.getBinary(req.params.asset);
  } catch (_e) {
    // guess there wasn't an asset with that name
  }
  if (packagedAsset) {
    res.statusCode = 200;
    const mimeType = mime.contentType(req.params.asset);
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.send(Buffer.from(packagedAsset));
    res.end();
    return;
  }

  // No match.
  console.log(`[assets] 404 GET ${req.params.asset}`);
  res.status(404).send('Sorry, not found');
});

const UPLOAD_TOKEN_VALIDITY_MSEC = 60000; // 60 seconds
const UPLOAD_MAX_FILE_SIZE = 1048576; // 1 MiB
router.post('/:uploadToken', (req, res) => {
  check(req.params.uploadToken, String);
  // Look up upload token.  If missing, or too old (>1m), reject with a 403.
  const uploadToken = UploadTokens.findOne(req.params.uploadToken);

  // Regardless of age, once a token is presented, we should remove it.
  UploadTokens.remove(req.params.uploadToken);

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
  req.on('end', Meteor.bindEnvironment(() => {
    // Concatenate chunks into a single buffer representing the entire file contents
    const contents = Buffer.concat(chunks);
    console.log(`[assets] 200 POST ${req.params.uploadToken} ${uploadToken.asset} ${contents.length} bytes`);

    // Compute md5 for eTag.
    const md5 = crypto.createHash('md5').update(contents).digest('hex');
    // Compute sha256, which is the _id of the Blob
    const sha256 = crypto.createHash('sha256').update(contents).digest('hex');
    // Insert the Blob
    Blobs.upsert({ _id: sha256 }, {
      $set: {
        value: contents,
        mimeType: uploadToken.mimeType,
        md5,
        size: contents.length,
      },
    });
    // Save the mapping from asset name to the Blob we just inserted.
    BlobMappings.upsert({ _id: uploadToken.asset }, {
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
