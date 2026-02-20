import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import mergeUsers from "../../lib/jobs/mergeUsers";
import Announcements from "../../lib/models/Announcements";
import APIKeys from "../../lib/models/APIKeys";
import BlobMappings from "../../lib/models/BlobMappings";
import BookmarkNotifications from "../../lib/models/BookmarkNotifications";
import Bookmarks from "../../lib/models/Bookmarks";
import ChatMessages from "../../lib/models/ChatMessages";
import ChatNotifications from "../../lib/models/ChatNotifications";
import DiscordCache from "../../lib/models/DiscordCache";
import DiscordRoleGrants from "../../lib/models/DiscordRoleGrants";
import DocumentActivities from "../../lib/models/DocumentActivities";
import Documents from "../../lib/models/Documents";
import FeatureFlags from "../../lib/models/FeatureFlags";
import FolderPermissions from "../../lib/models/FolderPermissions";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import InvitationCodes from "../../lib/models/InvitationCodes";
import Jobs from "../../lib/models/Jobs";
import MergeOperations from "../../lib/models/MergeOperations";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { AllModels } from "../../lib/models/Model";
import CallHistories from "../../lib/models/mediasoup/CallHistories";
import ConnectAcks from "../../lib/models/mediasoup/ConnectAcks";
import ConnectRequests from "../../lib/models/mediasoup/ConnectRequests";
import ConsumerAcks from "../../lib/models/mediasoup/ConsumerAcks";
import Consumers from "../../lib/models/mediasoup/Consumers";
import MonitorConnectAcks from "../../lib/models/mediasoup/MonitorConnectAcks";
import MonitorConnectRequests from "../../lib/models/mediasoup/MonitorConnectRequests";
import PeerRemoteMutes from "../../lib/models/mediasoup/PeerRemoteMutes";
import Peers from "../../lib/models/mediasoup/Peers";
import ProducerClients from "../../lib/models/mediasoup/ProducerClients";
import ProducerServers from "../../lib/models/mediasoup/ProducerServers";
import Rooms from "../../lib/models/mediasoup/Rooms";
import Routers from "../../lib/models/mediasoup/Routers";
import TransportRequests from "../../lib/models/mediasoup/TransportRequests";
import TransportStates from "../../lib/models/mediasoup/TransportStates";
import Transports from "../../lib/models/mediasoup/Transports";
import PendingAnnouncements from "../../lib/models/PendingAnnouncements";
import Puzzles from "../../lib/models/Puzzles";
import Servers from "../../lib/models/Servers";
import Settings from "../../lib/models/Settings";
import Tags from "../../lib/models/Tags";
import addUsersToDiscordRole from "../addUsersToDiscordRole";
import { ensureHuntFolderPermission } from "../gdrive";
import ignoringDuplicateKeyErrors, {
  isDuplicateKeyError,
} from "../ignoringDuplicateKeyErrors";
import Blobs from "../models/Blobs";
import CallActivities from "../models/CallActivities";
import DriveActivityLatests from "../models/DriveActivityLatests";
import HuntFolders from "../models/HuntFolders";
import LatestDeploymentTimestamps from "../models/LatestDeploymentTimestamps";
import Locks from "../models/Locks";
import Subscribers from "../models/Subscribers";
import UploadTokens from "../models/UploadTokens";
import defineJob from "./framework/defineJob";
import PermanentJobError from "./framework/PermanentJobError";

// All withCommon models — we update createdBy/updatedBy references on all of them.
const MODELS_WITH_COMMON: { collection: { rawCollection(): any } }[] = [
  Announcements,
  APIKeys,
  BookmarkNotifications,
  Bookmarks,
  // ChatMessages is handled entirely in ADDITIONAL_FK_UPDATES (single-pass
  // cursor walk that rewrites sender, mentions, createdBy, and updatedBy
  // together, since none of these fields are indexed).
  ChatNotifications,
  ConnectAcks,
  ConnectRequests,
  ConsumerAcks,
  Consumers,
  DiscordRoleGrants,
  Documents,
  FeatureFlags,
  FolderPermissions,
  Guesses,
  Hunts,
  InvitationCodes,
  MergeOperations,
  PeerRemoteMutes,
  Peers,
  PendingAnnouncements,
  ProducerClients,
  ProducerServers,
  Puzzles,
  Rooms,
  Routers,
  Settings,
  Tags,
  TransportRequests,
  TransportStates,
  Transports,
  UploadTokens,
];

// Models with no user foreign keys (or with non-user FKs we skip).
const MODELS_EXPLICITLY_SKIPPED = [
  BlobMappings,
  Blobs,
  CallHistories,
  DiscordCache,
  DriveActivityLatests,
  HuntFolders,
  LatestDeploymentTimestamps,
  Locks,
  MonitorConnectAcks,
  MonitorConnectRequests,
  Servers,
];

// Collections with user FK fields beyond createdBy/updatedBy. Each callback
// handles all FK updates for that collection.
type FKUpdateFn = (
  sourceUser: string,
  targetUser: string,
  signal: AbortSignal,
) => Promise<void>;
const ADDITIONAL_FK_UPDATES = new Map<{ name: string }, FKUpdateFn>([
  [
    Jobs,
    async (source, target) => {
      // Jobs has its own createdBy (not from withCommon).
      await Jobs.collection
        .rawCollection()
        .updateMany({ createdBy: source }, { $set: { createdBy: target } });
    },
  ],
  [
    ChatMessages,
    async (source, target, signal) => {
      // Single-pass cursor walk: none of sender, createdBy, updatedBy, or
      // content.children.userId are indexed on ChatMessages, so four separate
      // updateMany calls would each do a full collection scan. Instead, scan
      // once and issue targeted updateOne calls per matching document.
      const raw = ChatMessages.collection.rawCollection();
      for await (const msg of raw.find({
        $or: [
          { sender: source },
          { createdBy: source },
          { updatedBy: source },
          {
            "content.children": {
              $elemMatch: { type: "mention", userId: source },
            },
          },
        ],
      })) {
        signal.throwIfAborted();

        const $set: Record<string, string> = {};
        if (msg.sender === source) $set.sender = target;
        if (msg.createdBy === source) $set.createdBy = target;
        if (msg.updatedBy === source) $set.updatedBy = target;
        if (Object.keys($set).length > 0) {
          await raw.updateOne({ _id: msg._id }, { $set });
        }

        const hasMention = msg.content?.children?.some(
          (child) =>
            "type" in child &&
            child.type === "mention" &&
            child.userId === source,
        );
        if (hasMention) {
          await raw.updateOne(
            { _id: msg._id },
            { $set: { "content.children.$[elem].userId": target } },
            {
              arrayFilters: [{ "elem.type": "mention", "elem.userId": source }],
            },
          );
        }
      }
    },
  ],
  [
    ChatNotifications,
    async (source, target) => {
      const raw = ChatNotifications.collection.rawCollection();
      await raw.updateMany({ sender: source }, { $set: { sender: target } });
      // Delete stale notification records for the deactivated source user.
      await raw.deleteMany({ user: source });
    },
  ],
  [
    Peers,
    async (source, target) => {
      await Peers.collection
        .rawCollection()
        .updateMany(
          { remoteMutedBy: source },
          { $set: { remoteMutedBy: target } },
        );
    },
  ],
  [
    Subscribers,
    async (source, target) => {
      await Subscribers.collection
        .rawCollection()
        .updateMany({ user: source }, { $set: { user: target } });
    },
  ],
  [
    APIKeys,
    async (source, target) => {
      await APIKeys.collection
        .rawCollection()
        .updateMany({ user: source }, { $set: { user: target } });
    },
  ],
  [
    Bookmarks,
    async (source, target, signal) => {
      await reassignUniqueFK(
        Bookmarks.collection,
        "user",
        source,
        target,
        signal,
      );
    },
  ],
  [
    DocumentActivities,
    async (source, target, signal) => {
      await reassignUniqueFK(
        DocumentActivities.collection,
        "user",
        source,
        target,
        signal,
      );
    },
  ],
  [
    CallActivities,
    async (source, target, signal) => {
      await reassignUniqueFK(
        CallActivities.collection,
        "user",
        source,
        target,
        signal,
      );
    },
  ],
  [
    FolderPermissions,
    async (source, target, signal) => {
      await reassignUniqueFK(
        FolderPermissions.collection,
        "user",
        source,
        target,
        signal,
      );
    },
  ],
  [
    DiscordRoleGrants,
    async (source, target, signal) => {
      await reassignUniqueFK(
        DiscordRoleGrants.collection,
        "user",
        source,
        target,
        signal,
      );
    },
  ],
  [
    PendingAnnouncements,
    async (source) => {
      await PendingAnnouncements.collection
        .rawCollection()
        .deleteMany({ user: source });
    },
  ],
  [
    BookmarkNotifications,
    async (source) => {
      await BookmarkNotifications.collection
        .rawCollection()
        .deleteMany({ user: source });
    },
  ],
]);

// Verify at startup that every Model is classified, so we don't silently miss
// a new collection with user foreign keys.
Meteor.startup(() => {
  const knownCollections = new Set([
    ...MODELS_WITH_COMMON,
    ...MODELS_EXPLICITLY_SKIPPED,
    ...ADDITIONAL_FK_UPDATES.keys(),
  ]);
  for (const model of AllModels) {
    if (model.name.startsWith("test_schema")) continue;
    if (!knownCollections.has(model)) {
      throw new Error(
        `Please classify the ${model.name} collection in imports/server/jobs/mergeUsers.ts`,
      );
    }
  }
});

// Reassign a foreign key field from one user to another on a collection where
// the field is part of a unique constraint. Can't use a bulk updateMany because
// a matching record for the target may already exist; instead, we update
// per-record and delete the source's record on conflict.
async function reassignUniqueFK(
  collection: { rawCollection(): any },
  field: string,
  sourceUser: string,
  targetUser: string,
  signal: AbortSignal,
) {
  const raw = collection.rawCollection();
  const cursor = raw.find({ [field]: sourceUser });
  for await (const doc of cursor) {
    signal.throwIfAborted();
    try {
      await raw.updateOne({ _id: doc._id }, { $set: { [field]: targetUser } });
    } catch (e) {
      if (!isDuplicateKeyError(e)) throw e;
      // The target already has an equivalent record — the source's is
      // redundant, so delete it.
      await raw.deleteOne({ _id: doc._id });
    }
  }
}

defineJob(mergeUsers, {
  async run({ sourceUser, targetUser }, { jobId, signal, setResult }) {
    Logger.info("Starting user merge", { sourceUser, targetUser, jobId });

    const stepsTotal = 9;
    let stepsCompleted = 0;
    const reportComplete = () =>
      setResult({
        status: "done",
        step: "Complete",
        stepsCompleted: stepsTotal,
        stepsTotal,
      });

    await setResult({
      status: "active",
      step: "Validating",
      stepsCompleted,
      stepsTotal,
    });

    // Create MergeOperation record (idempotent).
    let moId: string;
    try {
      moId = await MergeOperations.insertAsync({
        participants: [sourceUser, targetUser],
        job: jobId,
      });
    } catch (e) {
      if (!isDuplicateKeyError(e)) {
        throw e;
      }

      // Duplicate key on the partial unique index — an in-flight operation
      // already exists for these participants.
      const existing = await MergeOperations.findOneAsync({
        participants: [sourceUser, targetUser],
        job: jobId,
      });
      if (existing?.completedAt) {
        // Our previous run completed the merge. Nothing left to do.
        Logger.info("Merge operation already completed by this job", {
          sourceUser,
          targetUser,
          jobId,
        });
        await reportComplete();
        return;
      } else if (existing) {
        moId = existing._id;
      } else {
        // The in-flight operation belongs to a different job (or completed
        // between our insert and this query).
        throw new PermanentJobError(
          "Another merge operation is already in progress for these users",
        );
      }
    }

    // Verify both users exist.
    const target = await MeteorUsers.findOneAsync(targetUser);
    if (!target) {
      throw new PermanentJobError(`Target user ${targetUser} does not exist`);
    }

    const source = await MeteorUsers.findOneAsync(sourceUser);
    if (!source) {
      const mo = await MergeOperations.findOneAsync(moId);
      if (!mo?.snapshot) {
        throw new PermanentJobError(`Source user ${sourceUser} does not exist`);
      }
      // Source was already deleted on a previous run — skip to finalize.
      Logger.info("Source user already deleted, marking merge complete", {
        sourceUser,
        targetUser,
      });
      await MergeOperations.updateAsync(moId, {
        $set: { completedAt: new Date() },
      });
      await reportComplete();
      return;
    }

    signal.throwIfAborted();
    stepsCompleted += 1;
    await setResult({
      status: "active",
      step: "Deactivating source account",
      stepsCompleted,
      stepsTotal,
    });

    // Mark source as merged. This field's only purpose is to block future
    // logins (via validateLoginAttempt in accounts.ts); concurrency control is
    // handled entirely by the MergeOperations unique index.
    await MeteorUsers.updateAsync(sourceUser, {
      $set: { mergedInto: targetUser },
    });

    // Invalidate all login sessions for the source user.
    await MeteorUsers.updateAsync(sourceUser, {
      $set: { "services.resume.loginTokens": [] },
    });

    signal.throwIfAborted();
    stepsCompleted += 1;
    await setResult({
      status: "active",
      step: "Snapshotting source fields",
      stepsCompleted,
      stepsTotal,
    });

    // Snapshot unique fields (only if not yet populated — idempotent).
    await MergeOperations.updateAsync(
      { _id: moId, snapshot: { $exists: false } },
      {
        $set: {
          snapshot: {
            emails: source.emails ?? [],
            googleAccount: source.googleAccount,
            googleAccountId: source.googleAccountId,
            googleProfilePicture: source.googleProfilePicture,
            discordAccount: source.discordAccount,
          },
        },
      },
    );

    // Re-read the merge operation to get the snapshot.
    const mo = await MergeOperations.findOneAsync(moId);
    if (!mo?.snapshot) {
      throw new Error("Snapshot should exist after snapshotting step");
    }
    const { snapshot } = mo;

    signal.throwIfAborted();
    stepsCompleted += 1;
    await setResult({
      status: "active",
      step: "Clearing source unique fields",
      stepsCompleted,
      stepsTotal,
    });

    // Clear unique fields from the source user so they can be assigned to the
    // target without conflict.
    await MeteorUsers.updateAsync(sourceUser, {
      $unset: {
        emails: "",
        googleAccount: "",
        googleAccountId: "",
        googleProfilePicture: "",
        discordAccount: "",
      },
    });

    signal.throwIfAborted();
    stepsCompleted += 1;
    await setResult({
      status: "active",
      step: "Transferring unique fields to target",
      stepsCompleted,
      stepsTotal,
    });

    // Populate target with snapshot data.

    // Meteor's unique index on emails.address prevents the same email from
    // showing up on different users, but not from showing up multiple times on
    // the same user. This means that we need to:
    //
    // * Guard against the email already being present on the user (which almost
    //   certainly means that we are retrying after a partial failure)
    // * Guard against the email being present on another user. This can only
    //   really happen if an external actor claims one of the source's freed
    //   emails in the window between our clearing and copying steps. Unlikely,
    //   but in that case there's no reasonable recovery, so just skip that
    //   email and continue.
    //
    // We also need to make sure the verified status is preserved. (It's a
    // one-way ratchet).
    for (const email of snapshot.emails) {
      await ignoringDuplicateKeyErrors(() =>
        MeteorUsers.updateAsync(
          { _id: targetUser, "emails.address": { $ne: email.address } },
          {
            $push: { emails: email },
          },
        ),
      );
      if (email.verified) {
        await MeteorUsers.updateAsync(
          { _id: targetUser, "emails.address": email.address },
          {
            $set: { "emails.$.verified": true },
          },
        );
      }
    }

    // Set Google/Discord fields if not already present on target. Each update
    // uses a selector guard so it's idempotent and won't overwrite values that
    // arrived between steps.
    if (snapshot.googleAccount) {
      await MeteorUsers.updateAsync(
        { _id: targetUser, googleAccount: { $exists: false } },
        { $set: { googleAccount: snapshot.googleAccount } },
      );
    }
    if (snapshot.googleAccountId) {
      await MeteorUsers.updateAsync(
        { _id: targetUser, googleAccountId: { $exists: false } },
        { $set: { googleAccountId: snapshot.googleAccountId } },
      );
    }
    if (snapshot.googleProfilePicture) {
      await MeteorUsers.updateAsync(
        { _id: targetUser, googleProfilePicture: { $exists: false } },
        { $set: { googleProfilePicture: snapshot.googleProfilePicture } },
      );
    }
    if (snapshot.discordAccount) {
      await MeteorUsers.updateAsync(
        { _id: targetUser, discordAccount: { $exists: false } },
        { $set: { discordAccount: snapshot.discordAccount } },
      );
    }

    signal.throwIfAborted();
    stepsCompleted += 1;
    await setResult({
      status: "active",
      step: "Copying non-unique fields to target",
      stepsCompleted,
      stepsTotal,
    });

    // Copy non-unique fields from source to target.

    // Hunts
    if (source.hunts?.length) {
      await MeteorUsers.updateAsync(targetUser, {
        $addToSet: { hunts: { $each: source.hunts } },
      });
    }

    // Roles: per-scope union
    const sourceRoles = source.roles ?? {};
    for (const [scope, roles] of Object.entries(sourceRoles)) {
      if (roles.length > 0) {
        await MeteorUsers.updateAsync(targetUser, {
          $addToSet: { [`roles.${scope}`]: { $each: roles } },
        });
      }
    }

    // Dingwords
    if (source.dingwords?.length) {
      await MeteorUsers.updateAsync(targetUser, {
        $addToSet: { dingwords: { $each: source.dingwords } },
      });
    }

    // huntTermsAcceptedAt: prefer earlier timestamps. $min sets the field to
    // the lesser of the current and specified values, and creates it if it
    // doesn't exist.
    for (const [huntId, ts] of Object.entries(
      source.huntTermsAcceptedAt ?? {},
    )) {
      await MeteorUsers.updateAsync(targetUser, {
        $min: { [`huntTermsAcceptedAt.${huntId}`]: ts },
      });
    }

    // phoneNumber, displayName: set if not present on target.
    if (source.phoneNumber) {
      await MeteorUsers.updateAsync(
        { _id: targetUser, phoneNumber: { $exists: false } },
        { $set: { phoneNumber: source.phoneNumber } },
      );
    }
    if (source.displayName) {
      await MeteorUsers.updateAsync(
        { _id: targetUser, displayName: { $exists: false } },
        { $set: { displayName: source.displayName } },
      );
    }

    // Discord OAuth credentials (access token, refresh token, etc.)
    const discordServiceData = source.services?.discord;
    if (discordServiceData) {
      await MeteorUsers.updateAsync(
        { _id: targetUser, "services.discord": { $exists: false } },
        { $set: { "services.discord": discordServiceData } },
      );
    }

    // Update foreign key references.
    signal.throwIfAborted();
    stepsCompleted += 1;
    const fkSubstepsTotal =
      MODELS_WITH_COMMON.length + ADDITIONAL_FK_UPDATES.size;
    let fkSubstepsCompleted = 0;
    const reportFKProgress = () =>
      setResult({
        status: "background",
        step: "Updating foreign key references",
        stepsCompleted,
        stepsTotal,
        substepsCompleted: fkSubstepsCompleted,
        substepsTotal: fkSubstepsTotal,
      });
    await reportFKProgress();

    // Bulk update createdBy/updatedBy on all withCommon models.
    for (const model of MODELS_WITH_COMMON) {
      signal.throwIfAborted();
      const raw = model.collection.rawCollection();
      await raw.updateMany(
        { createdBy: sourceUser },
        { $set: { createdBy: targetUser } },
      );
      await raw.updateMany(
        { updatedBy: sourceUser },
        { $set: { updatedBy: targetUser } },
      );
      fkSubstepsCompleted += 1;
      await reportFKProgress();
    }

    // Additional per-collection FK updates.
    for (const [, update] of ADDITIONAL_FK_UPDATES) {
      signal.throwIfAborted();
      await update(sourceUser, targetUser, signal);
      fkSubstepsCompleted += 1;
      await reportFKProgress();
    }

    signal.throwIfAborted();
    stepsCompleted += 1;
    await setResult({
      status: "background",
      step: "Re-running external side effects",
      stepsCompleted,
      stepsTotal,
    });

    // Re-run external side effects for the target user.
    const finalTarget = await MeteorUsers.findOneAsync(targetUser);
    if (finalTarget) {
      const hunts = finalTarget.hunts ?? [];
      for (const huntId of hunts) {
        signal.throwIfAborted();
        if (finalTarget.googleAccount) {
          try {
            await ensureHuntFolderPermission(
              huntId,
              targetUser,
              finalTarget.googleAccount,
            );
          } catch (e) {
            Logger.warn("Failed to ensure hunt folder permission", {
              huntId,
              targetUser,
              error: e,
            });
          }
        }
        if (finalTarget.discordAccount) {
          try {
            await addUsersToDiscordRole([targetUser], huntId);
          } catch (e) {
            Logger.warn("Failed to add user to Discord role", {
              huntId,
              targetUser,
              error: e,
            });
          }
        }
      }
    }

    stepsCompleted += 1;
    await setResult({
      status: "background",
      step: "Finalizing",
      stepsCompleted,
      stepsTotal,
    });

    // Finalize — delete source user and mark complete.
    await MeteorUsers.removeAsync(sourceUser);
    await MergeOperations.updateAsync(moId, {
      $set: { completedAt: new Date() },
    });

    stepsCompleted += 1;
    await reportComplete();

    Logger.info("User merge completed", { sourceUser, targetUser, jobId });
  },
});
