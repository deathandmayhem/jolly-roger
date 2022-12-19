import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { WebApp } from 'meteor/webapp';
import express from 'express';
import pThrottle from 'p-throttle';
import Ansible from '../Ansible';
import Flags from '../Flags';
import DocumentActivities from '../lib/models/DocumentActivities';
import Documents from '../lib/models/Documents';
import FeatureFlags from '../lib/models/FeatureFlags';
import DriveClient from './gdriveClientRefresher';
import ignoringDuplicateKeyErrors from './ignoringDuplicateKeyErrors';
import DocumentWatches from './models/DocumentWatches';
import Locks from './models/Locks';
import { DocumentWatchType } from './schemas/DocumentWatch';

/* expire more quickly in development to minimize requests hitting after server shutdown */
const EXPIRE_WINDOW = Meteor.isDevelopment ?
  5 * 60 * 1000 :
  24 * 60 * 60 * 1000;
const RENEW_WINDOW = EXPIRE_WINDOW * 0.2;
const ACTIVITY_GRANULARITY = 5 * 60 * 1000; // milliseconds
const WEBHOOK_PREFIX = '/_gdrive/watch';

// Handle incoming webhooks from Google Drive
const webhook = express();
// Express's API is entirely callback-driven, so it doesn't matter if our
// function is async (it just means that exceptions won't be caught).
// eslint-disable-next-line @typescript-eslint/no-misused-promises
webhook.post('/', async (req, res) => {
  if (req.get('X-Goog-Resource-State') === 'sync') {
    res.sendStatus(200);
    return;
  }

  const documentId = req.get('X-Goog-Channel-Token');
  if (!documentId) {
    res.sendStatus(400);
    return;
  }

  const document = Documents.findOne(documentId);
  if (!document) {
    res.sendStatus(404);
    return;
  }

  // Round the current time to the nearest 5 seconds
  const roundedTime = new Date(
    Math.round(new Date().getTime() / ACTIVITY_GRANULARITY) * ACTIVITY_GRANULARITY
  );
  await ignoringDuplicateKeyErrors(async () => {
    await DocumentActivities.insertAsync({
      ts: roundedTime,
      hunt: document.hunt,
      puzzle: document.puzzle,
      document: document._id,
    });
  });
  res.sendStatus(200);
});
WebApp.connectHandlers.use(WEBHOOK_PREFIX, Meteor.bindEnvironment(webhook));

// Google Drive allows 20000 requests per 100 seconds. We'll claim 0.5% of that,
// which is low enough that it shouldn't impact more important work, but with a
// high enough window that we get some light bursting in.
const throttled = pThrottle({
  interval: 100 * 1000,
  limit: 100,
});

// Setup and maintain watches on all Google Drive documents
class GDriveDocumentWatcher {
  rootUrl: string;

  watchUrl: string;

  documentWatchTimeouts: Map<string, number>;

  documentObserver: Meteor.LiveQueryHandle;

  documentWatchObserver: Meteor.LiveQueryHandle;

  constructor(rootUrl: string) {
    this.rootUrl = rootUrl;
    this.watchUrl = Meteor.absoluteUrl(WEBHOOK_PREFIX, { rootUrl });
    this.documentWatchTimeouts = new Map();

    this.documentObserver = Documents.find({ provider: 'google' }).observeChanges({
      added: (id) => {
        void this.refreshWatch(id);
      },
    });

    this.documentWatchObserver = DocumentWatches.find().observe({
      added: (watch) => {
        void this.scheduleWatchRefresh(watch._id, watch.watchExpiration, watch.document);
      },
      changed: (watch) => {
        void this.scheduleWatchRefresh(watch._id, watch.watchExpiration, watch.document);
      },
      removed: (watch) => {
        void this.clearWatchRefresh(watch._id);
      },
    });
  }

  stop() {
    this.documentObserver.stop();
    this.documentWatchTimeouts.forEach((_, id) => this.clearWatchRefresh(id));
  }

  scheduleWatchRefresh(id: string, expiration: Date, document: string) {
    this.clearWatchRefresh(id);

    const now = new Date();
    // Schedule renewal at least 1/2 of the renewal window before expiration
    const renewalBuffer = (Math.random() / 2 + 0.5) * RENEW_WINDOW;
    const timeout = Math.max(
      0,
      expiration.getTime() - now.getTime() - renewalBuffer,
    );
    this.documentWatchTimeouts.set(id, Meteor.setTimeout(() => {
      void this.refreshWatch(document);
    }, timeout));
  }

  clearWatchRefresh(id: string) {
    const oldTimeout = this.documentWatchTimeouts.get(id);
    if (oldTimeout) {
      Meteor.clearTimeout(oldTimeout);
      this.documentWatchTimeouts.delete(id);
    }
  }

  watchExpired(watch: DocumentWatchType | undefined) {
    if (!watch) {
      return true;
    }

    const now = new Date();
    return now.getTime() > watch.watchExpiration.getTime() - RENEW_WINDOW;
  }

  async refreshWatch(id: string) {
    await throttled(async () => {
      const preLockWatch = await DocumentWatches.findOneAsync({ document: id });
      if (!this.watchExpired(preLockWatch)) {
        return;
      }

      await Locks.withLock(`document-watch:${id}`, async () => {
        if (!DriveClient.gdrive) {
          return;
        }

        const watch = await DocumentWatches.findOneAsync({ document: id });
        if (!this.watchExpired(watch)) {
          return;
        }

        const document = await Documents.findOneAsync({ _id: id });
        if (!document) {
          return;
        }

        const watchId = Random.id();
        const watchExpiration = new Date(Date.now() + EXPIRE_WINDOW);

        Ansible.log('Refreshing watch', { document: document.value.id, watchId, watchExpiration });
        const resp = await DriveClient.gdrive.files.watch({
          fileId: document.value.id,
          requestBody: {
            id: watchId,
            token: document._id,
            type: 'webhook',
            address: this.watchUrl,
            expiration: watchExpiration.getTime() as any,
          },
        });

        const update = {
          watchId,
          watchExpiration,
          watchResourceId: resp.data.resourceId!,
        };
        if (watch) {
          await DocumentWatches.updateAsync(watch._id, {
            $set: update,
          });
        } else {
          await DocumentWatches.insertAsync({
            document: id,
            ...update,
          });
        }

        // Clean up the old watch if there was one
        if (watch) {
          await DriveClient.gdrive.channels.stop({
            requestBody: {
              id: watch.watchId,
              resourceId: watch.watchResourceId,
            },
          });
        }
      });
    })();
  }
}

const NGROK_API_URL = 'http://127.0.0.1:4040';

let warnedAboutWebhooks = false;
async function discoverWebhookRoot() {
  const url = Meteor.absoluteUrl();
  if (!Meteor.isDevelopment) {
    return url;
  }

  const parsed = new URL(url);
  if (parsed.hostname !== 'localhost') {
    return url;
  }

  let tunnels;
  let api;
  try {
    // ngrok is an optional dependency, so we tolerate its absence
    // eslint-disable-next-line import/no-unresolved
    const ngrok = await import('ngrok');
    api = new ngrok.NgrokClient(NGROK_API_URL);
    tunnels = await api.listTunnels();
  } catch (e) {
    if (!warnedAboutWebhooks) {
      /* eslint-disable no-console */
      console.warn(e);
      console.warn();
      console.warn(
        'Unable to discover a URL for receiving webhooks. If you want to test incoming Google\n' +
        'Drive webhooks, then jolly-roger needs to be accessible from the internet. The easiest\n' +
        'choice is to start ngrok by running "meteor npx ngrok start --none" (we will\n' +
        'automatically configure the rest).\n' +
        '\n' +
        'But if you would prefer to set things up manually, set the ROOT_URL environment\n' +
        'variable to a publicly accessible URL that routes to this jolly-roger server.'
      );
      /* eslint-enable no-console */
      warnedAboutWebhooks = true;
    }
    return undefined;
  }

  const tunnel = tunnels.tunnels.find((t) => {
    const parsedTunnel = new URL(t.config.addr);
    return t.proto === 'https' && parsedTunnel.port === parsed.port;
  });

  if (tunnel) {
    return tunnel.public_url;
  }

  // No tunnel, so we need to try and create one
  const newTunnel = await api.startTunnel({ name: 'jolly-roger', proto: 'http', addr: url });
  return newTunnel.public_url;
}

Meteor.startup(() => {
  if (Meteor.isTest || Meteor.isAppTest) {
    return;
  }

  let watcher: GDriveDocumentWatcher | undefined;
  const updateWatcher = async () => {
    const disabled = Flags.active('disable.gdrive_watchers');
    if (disabled) {
      watcher?.stop();
      watcher = undefined;
      return;
    }

    const newRootUrl = await discoverWebhookRoot();
    const shouldRestart = newRootUrl !== watcher?.rootUrl;

    if (shouldRestart) {
      watcher?.stop();
      watcher = undefined;
      if (newRootUrl) {
        Ansible.log('Starting Google Drive webhooks with public URL', { url: newRootUrl });
        watcher = new GDriveDocumentWatcher(newRootUrl);
      }
    }
  };
  Meteor.setInterval(updateWatcher, 5 * 1000);
  FeatureFlags.find({ name: 'disable.gdrive_watchers' }).observe({
    added: () => { void updateWatcher(); },
    changed: () => { void updateWatcher(); },
    removed: () => { void updateWatcher(); },
  });
});
