import { Meteor } from "meteor/meteor";
import Flags from "../Flags";
import Logger from "../Logger";
import {
  ACTIVITY_GRANULARITY,
  ACTIVITY_SEGMENTS,
} from "../lib/config/activityTracking";
import DocumentActivities from "../lib/models/DocumentActivities";
import Documents from "../lib/models/Documents";
import MeteorUsers from "../lib/models/MeteorUsers";
import Settings from "../lib/models/Settings";
import roundedTime from "../lib/roundedTime";
import GoogleClient from "./googleClientRefresher";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import DriveActivityLatests from "./models/DriveActivityLatests";
import withLock, { PREEMPT_TIMEOUT } from "./withLock";
import UserStatuses, { UserStatus } from "../lib/models/UserStatuses";

async function recordDriveChanges(
  ts: Date,
  fileIds: string[],
  googleAccountIds: string[],
) {
  const time = roundedTime(ACTIVITY_GRANULARITY, ts);

  // In all likelihood, we will only have one of each of these, but for
  // completeness we'll record the full cartesian product
  for await (const fileId of fileIds) {
    const document = await Documents.findOneAsync({ "value.id": fileId });
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
      const user = await MeteorUsers.findOneAsync(
        {
          googleAccountId,
          hunts: document.hunt,
        },
        { sort: { createdAt: 1 } },
      );

      await ignoringDuplicateKeyErrors(async () => {
        await DocumentActivities.insertAsync({
          ts: time,
          document: document._id,
          hunt: document.hunt,
          puzzle: document.puzzle,
          user: user?._id,
        });
        await UserStatuses.upsertAsync({
          user: user?._id,
          type: 'puzzleStatus',
          hunt: document.hunt,
        }, {
          $set: {
            status: "document",
            puzzle: document.puzzle,
          }
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

  const root = await Settings.findOneAsync({ name: "gdrive.root" });
  const credential = await Settings.findOneAsync({ name: "gdrive.credential" });

  // Don't fetch history that's older than what we'd display
  const previousTimestamp = Math.max(
    (await DriveActivityLatests.findOneAsync("default"))?.ts.getTime() ?? 0,
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
        ancestorName: root?.value.id ? `items/${root.value.id}` : undefined,
      },
    });
    pageToken = resp.data.nextPageToken ?? undefined;

    if (resp.data.activities) {
      // Accumulate a promise that resolves to the latest timestamp we've seen
      for (const activity of resp.data.activities) {
        // See if this is a document edit action
        if (!activity.actions?.some((action) => action.detail?.edit)) {
          continue;
        }

        if (!activity.timestamp || !activity.targets || !activity.actors) {
          continue;
        }

        const ts = new Date(activity.timestamp);

        // In testing, it seems like an activity generally only has one target
        // and one actor, but we handle receiving more than one of both just in
        // case.
        const documentIds = [
          ...activity.targets.reduce<Set<string>>((acc, target) => {
            if (target.driveItem?.name?.startsWith("items/")) {
              acc.add(target.driveItem.name.substring("items/".length));
            }

            return acc;
          }, new Set()),
        ];

        const actorIds = [
          ...activity.actors.reduce<Set<string>>((acc, actor) => {
            if (actor.user?.knownUser?.personName?.startsWith("people/")) {
              const actorId = actor.user.knownUser.personName.substring(
                "people/".length,
              );
              // Exclude edits made by the server drive user, since these aren't actual user edits.
              if (!credential?.value?.id || credential?.value?.id !== actorId) {
                acc.add(actorId);
              }
            }

            return acc;
          }, new Set()),
        ];

        await recordDriveChanges(ts, documentIds, actorIds);

        latestTimestamp = Math.max(latestTimestamp, ts.getTime());
      }
    }

    pageToken = resp.data.nextPageToken ?? undefined;
  } while (pageToken);

  await DriveActivityLatests.upsertAsync("default", {
    $set: {
      ts: new Date(latestTimestamp),
    },
  });
}

const FEATURE_FLAG_NAME = "disable.gdrive_document_activity";

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
    try {
      // Loop until the feature flag is disabled (i.e. the disabler is not
      // disabled)
      while (true) {
        if (!(await Flags.activeAsync(FEATURE_FLAG_NAME))) {
          break;
        }
        await featureFlagChanged();
      }

      await withLock("drive-activity", async (renew) => {
        // Ensure that we continue to hold the lock as long as we're alive.
        let renewInterval;
        try {
          const renewalFailure = new Promise<boolean>((r) => {
            renewInterval = Meteor.setInterval(async () => {
              try {
                await renew();
              } catch (e) {
                // We failed to renew the lock
                r(true);
              }
            }, PREEMPT_TIMEOUT / 2);
          });

          // As long as we are alive and the feature flag is not active, hold the
          // lock and keep looping
          while (true) {
            if (await Flags.activeAsync(FEATURE_FLAG_NAME)) {
              return; // from withLock
            }

            await fetchDriveActivity();

            // Wake up every 5 seconds (+/- 1 second of jitter)
            const sleep = new Promise<boolean>((r) => {
              Meteor.setTimeout(
                () => r(false),
                4 * 1000 + Math.random() * 2 * 1000,
              );
            });
            const renewalFailed = await Promise.race([sleep, renewalFailure]);
            if (renewalFailed) {
              return; // from withLock
            }
          }
        } finally {
          if (renewInterval) {
            Meteor.clearInterval(renewInterval);
          }
        }
      });
    } catch (error) {
      Logger.error("Error fetching drive activity", { error });
      // Sleep for 5 seconds before retrying
      await new Promise((r) => {
        Meteor.setTimeout(r, 5000);
      });
    }
  }
}

Meteor.startup(() => {
  if (Meteor.isTest || Meteor.isAppTest) {
    // We'll need to reevaluate this if we want to write tests for this code,
    // but this will do for now
    return;
  }
  void fetchActivityLoop();
});
