import crypto from 'crypto';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import express from 'express';
import Blobs from './models/blobs';
import UploadTokens from './models/upload_tokens';

/* eslint-disable no-console */

const app = express();

// eslint-disable-next-line new-cap
const router = express.Router();

const UPLOAD_TOKEN_VALIDITY_MSEC = 60000; // 60 seconds
router.post('/:uploadToken', (req, res) => {
  check(req.params.uploadToken, String);
  // Look up upload token.  If missing, or too old (>5m), reject with a 403.
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
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  // We need to call the final end callback in a fiber (via
  // Meteor.bindEnvironment) since we access Mongo stuff (Blobs) through
  // Meteor's collections.
  req.on('end', Meteor.bindEnvironment(() => {
    // Concatenate chunks into a single buffer representing the entire file contents
    const contents = Buffer.concat(chunks);
    console.log(`[assets] 200 POST ${req.params.uploadToken} ${uploadToken.asset} ${contents.length} bytes`);
    const base64value = contents.toString('base64');

    // Compute md5 for eTag.
    const md5 = crypto.createHash('md5').update(contents).digest('hex');
    Blobs.upsert({ _id: uploadToken.asset }, {
      $set: {
        value: base64value,
        mimeType: uploadToken.mimeType,
        md5,
        size: contents.length,
      },
    });
    res.status(200).send('Upload completed.');
    res.end();
  }));
});

app.use('/asset', router);

WebApp.connectHandlers.use('/', Meteor.bindEnvironment(app));
