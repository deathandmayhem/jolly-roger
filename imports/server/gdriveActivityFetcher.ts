import { Meteor } from 'meteor/meteor';
import Flags from '../Flags';
import { ACTIVITY_GRANULARITY, ACTIVITY_SEGMENTS } from '../lib/config/activityTracking';
import DocumentActivities from '../lib/models/DocumentActivities';
import Documents from '../lib/models/Documents';
import MeteorUsers from '../lib/models/MeteorUsers';
import roundedTime from '../lib/roundedTime';
import GoogleClient from './googleClientRefresher';
import ignoringDuplicateKeyErrors from './ignoringDuplicateKeyErrors';
import DriveActivityLatests from './models/DriveActivityLatests';
import Locks, { PREEMPT_TIMEOUT } from './models/Locks';

async function recordDriveChanges(ts: Date, fileIds: string[], googleAccountIds: string[]) {
  const time = roundedTime(ACTIVITY_GRANULARITY, ts);

  // In all likelihood, we will only have one of each of these, but for
  // completeness we'll record the full cartesian product
  for await (const fileId of fileIds) {
    const document = await Documents.findOneAsync({ 'value.id': fileId });
    if (!document) {
      continue;
    }

    for await (const googleAccountId of googleAccountIds) {
      // There's no guarantee that googleAccountId is unique (in fact, since
      // many people end up registered multiple times, it may frequently not
      // be). We can make it more likely to be unique by scoping the query to
      // the hunt, and we sort by createdAt to get a deterministic result (so we
      // don't mix-and-match which user we attribute to, as long as they don't
      // link/unlink their account).
      //
      // If we can't look up the account ID, we'll record as user=undefined
      // which we'll count as a seprate user
      const user = await MeteorUsers.findOneAsync({
        googleAccountId, hunts: document.hunt,
      }, { sort: { createdAt: 1 } });

      await ignoringDuplicateKeyErrors(async () => {
        await DocumentActivities.insertAsync({
          ts: time,
          document: document._id,
          hunt: document.hunt,
          puzzle: document.puzzle,
          user: user?._id,
        });
      });
    }
  }
}

async function fetchDriveActivity() {
  const { driveactivity } = GoogleClient;
  if (!driveactivity) {
    return;
  }

  // Don't fetch history that's older than what we'd display
  const previousTimestamp = Math.max(
    (await DriveActivityLatests.findOneAsync('default'))?.ts.getTime() ?? 0,
    Date.now() - ACTIVITY_GRANULARITY * ACTIVITY_SEGMENTS,
  );

  // Build in some buffer by starting 5 minutes before the latest timestamp
  // we've previously seen (our unique constraints will dedup any overlap)
  const filter = `time > ${previousTimestamp - 5 * 60 * 1000}`;

  let pageToken: string | undefined;
  let latestTimestamp = previousTimestamp;
  do {
    const resp = await driveactivity.activity.query({
      requestBody: {
        pageToken,
        filter,
      },
    });
    pageToken = resp.data.nextPageToken ?? undefined;

    if (resp.data.activities) {
      // Accumulate a promise that resolves to the latest timestamp we've seen
      latestTimestamp = await resp.data.activities.reduce(async (p, activity) => {
        const previousLatestTimestamp = await p;

        // See if this is a document edit action
        if (!activity.actions?.some((action) => action.detail?.edit)) {
          return previousLatestTimestamp;
        }

        if (!activity.timestamp || !activity.targets || !activity.actors) {
          return previousLatestTimestamp;
        }

        const ts = new Date(activity.timestamp);

        // In testing, it seems like an activity generally only has one target
        // and one actor, but we handle receiving more than one of both just in
        // case.
        const documentIds = [...activity.targets.reduce<Set<string>>((acc, target) => {
          if (target.driveItem?.name?.startsWith('items/')) {
            acc.add(target.driveItem.name.substring('items/'.length));
          }

          return acc;
        }, new Set())];

        const actorIds = [...activity.actors.reduce<Set<string>>((acc, actor) => {
          if (actor.user?.knownUser?.personName?.startsWith('people/')) {
            acc.add(actor.user.knownUser.personName.substring('people/'.length));
          }

          return acc;
        }, new Set())];

        await recordDriveChanges(ts, documentIds, actorIds);

        return Math.max(previousLatestTimestamp, ts.getTime());
      }, Promise.resolve(latestTimestamp));
    }

    pageToken = resp.data.nextPageToken ?? undefined;
  } while (pageToken);

  await DriveActivityLatests.upsertAsync('default', {
    $set: {
      ts: new Date(latestTimestamp),
    },
  });
}

const FEATURE_FLAG_NAME = 'disable.gdrive_document_activity';

async function featureFlagChanged() {
  let initializing = true;
  return new Promise<void>((r) => {
    let handle: Meteor.LiveQueryHandle | undefined;
    const cleanup = () => {
      if (!initializing) {
        handle?.stop();
        r();
      }
    };
    handle = Flags.observeChanges(FEATURE_FLAG_NAME, cleanup);
    initializing = false;
  });
}

async function fetchActivityLoop() {
  while (true) {
    // Loop until the feature flag is disabled (i.e. the disabler is not
    // disabled)
    while (true) {
      if (!Flags.active(FEATURE_FLAG_NAME)) {
        break;
      }
      await featureFlagChanged();
    }

    await Locks.withLock('drive-activity', async (lock) => {
      // Ensure that we continue to hold the lock as long as we're alive.
      let renew;
      try {
        renew = Meteor.setInterval(async () => {
          await Locks.renew(lock);
        }, PREEMPT_TIMEOUT / 2);

        // As long as we are alive and the feature flag is not active, hold the
        // lock and keep looping
        while (true) {
          if (Flags.active(FEATURE_FLAG_NAME)) {
            return;
          }

          await fetchDriveActivity();

          // Wake up every 5 seconds (+/- 1 second of jitter)
          await new Promise<void>((r) => {
            Meteor.setTimeout(r, 4 * 1000 + Math.random() * 2 * 1000);
          });
        }
      } finally {
        if (renew) {
          Meteor.clearInterval(renew);
        }
      }
    });
  }
}

Meteor.startup(() => {
  void fetchActivityLoop();
});