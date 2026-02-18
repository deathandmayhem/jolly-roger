import { setTimeout } from "node:timers/promises";
import { Meteor } from "meteor/meteor";
import {
  DeleteObjectsCommand,
  paginateListObjectsV2,
  S3Client,
} from "@aws-sdk/client-s3";
import type { z } from "zod";
import Flags from "../../Flags";
import Logger from "../../Logger";
import purgeHunt from "../../lib/jobs/purgeHunt";
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
import type Model from "../../lib/models/Model";
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
import { deleteDocument } from "../gdrive";
import Blobs from "../models/Blobs";
import CallActivities from "../models/CallActivities";
import DriveActivityLatests from "../models/DriveActivityLatests";
import HuntFolders from "../models/HuntFolders";
import LatestDeploymentTimestamps from "../models/LatestDeploymentTimestamps";
import Locks from "../models/Locks";
import Subscribers from "../models/Subscribers";
import UploadTokens from "../models/UploadTokens";
import defineJob from "./framework/defineJob";

const COLLECTIONS_TO_PURGE = [
  // Delete Puzzles first, because most things do a decent job of handling nonexistent puzzle ids,
  // and once the Puzzle object doesn't exist we reject a lot of other writes, so we're less likely
  // to leak objects and leave a mess
  Puzzles,
  // Other than that, try to mostly maintain referential integrity
  ChatNotifications,
  ChatMessages,
  Peers,
  Rooms,
  Routers,
  CallActivities,
  CallHistories,
  PendingAnnouncements,
  Announcements,
  DocumentActivities,
  Documents,
  Guesses,
  BookmarkNotifications,
  Bookmarks,
  Tags,
];

// In the fullness of time, it would be nice if we only had to list models
// that have a hunt foreignKey, but that involves a lot of walking zod schema
// objects and we're likely to have to rewrite any such code
const COLLECTIONS_EXPLICITLY_LEFT_UNTOUCHED = [
  // References hunt and should be left alone
  InvitationCodes,

  // Doesn't reference hunt but it was easier to write this enforcement around
  APIKeys,
  BlobMappings,
  Blobs,
  DiscordCache,
  DiscordRoleGrants,
  DriveActivityLatests,
  FeatureFlags,
  FolderPermissions,
  Hunts, // We don't want to touch the Hunts collection.
  HuntFolders,
  Jobs,
  LatestDeploymentTimestamps,
  Locks,
  MergeOperations,
  Servers,
  Settings,
  Subscribers,
  UploadTokens,
  // mediasoup
  ConnectAcks,
  ConnectRequests,
  ConsumerAcks,
  Consumers,
  MonitorConnectAcks,
  MonitorConnectRequests,
  PeerRemoteMutes,
  ProducerClients,
  ProducerServers,
  TransportRequests,
  TransportStates,
  Transports,
];

Meteor.startup(() => {
  // Check that we have classified every Model above, so we don't add a new
  // collection that references a hunt and forget to add it to the purge list.
  const knownCollections = new Set([
    ...COLLECTIONS_TO_PURGE,
    ...COLLECTIONS_EXPLICITLY_LEFT_UNTOUCHED,
  ]);
  for (const model of AllModels) {
    if (model.name.startsWith("test_schema")) {
      // These are randomly generated by the unit test suite, ignore them
      continue;
    }
    if (!knownCollections.has(model)) {
      throw new Error(
        `Please classify the ${model.name} collection as needing purging or not in imports/servers/jobs/purgeHunt.ts`,
      );
    }
  }
});

const DAYS_MSEC = 24 * 60 * 60 * 1000;

defineJob(purgeHunt, {
  deleteAfter: () => {
    return new Date(Date.now() + 30 * DAYS_MSEC);
  },
  async run(args, { signal, setResult }) {
    // Verify that hunt exists
    const hunt = await Hunts.findOneAsync(args.huntId);
    if (!hunt) {
      Logger.info("Hunt does not exist", { huntId: args.huntId });
      return;
    }

    const itemsTotal = 3 + COLLECTIONS_TO_PURGE.length;
    let itemsCompleted = 0;
    await setResult({ itemsTotal, itemsCompleted });

    // Remove all the Puzzles.  We do this first because once puzzle IDs no longer refer to a valid Puzzle,
    // we stop allowing insertion of other documents which reference that puzzle, which means we can expect
    // writes to quiesce and better guarantee that we don't leak documents due to clients making additional
    // requests.
    await Puzzles.removeAsync({ hunt: args.huntId });
    itemsCompleted += 1;
    await setResult({ itemsTotal, itemsCompleted });

    // Delete any Documents from the Google Drive
    if (await Flags.activeAsync("disable.google")) {
      Logger.info(
        "Skipping Document deletion because Google is disabled by feature flag",
        { huntId: args.huntId },
      );
    } else {
      const docs = await Documents.findAllowingDeleted({
        hunt: args.huntId,
      }).fetchAsync();
      const currentItemTotal = docs.length;
      let currentItemCompleted = 0;
      for (const doc of docs) {
        signal.throwIfAborted();
        Logger.info("Remove Google drive document", {
          id: doc._id,
          fileId: doc.value.id,
        });
        await deleteDocument(doc.value.id);
        await Documents.removeAsync(doc._id);
        currentItemCompleted += 1;
        await setResult({
          itemsTotal,
          itemsCompleted,
          currentItemTotal,
          currentItemCompleted,
        });
        // Avoid tripping on Drive's rate limits
        await setTimeout(500);
      }
    }
    itemsCompleted += 1;
    await setResult({ itemsTotal, itemsCompleted });

    // If an s3 bucket is configured, delete everything in the /{huntId} key prefix of that bucket
    const s3BucketSettings = await Settings.findOneAsync({
      name: "s3.image_bucket",
    });
    if (s3BucketSettings?.value) {
      const s3 = new S3Client({
        region: s3BucketSettings.value.bucketRegion,
      });

      const paginator = paginateListObjectsV2(
        { client: s3, pageSize: 500 },
        {
          Bucket: s3BucketSettings.value.bucketName,
          Prefix: `${args.huntId}/`,
        },
      );

      // We don't know the total number of pages without reading them, so we'll just track pages completed
      let currentItemCompleted = 0;
      for await (const page of paginator) {
        signal.throwIfAborted();
        if (page.Contents) {
          const keysToDelete = page.Contents.map((o) => {
            return {
              Key: o.Key,
            };
          });
          if (keysToDelete.length > 0) {
            await s3.send(
              new DeleteObjectsCommand({
                Bucket: s3BucketSettings.value.bucketName,
                Delete: {
                  Objects: keysToDelete,
                  Quiet: true,
                },
              }),
            );
          }
          currentItemCompleted += 1;
          await setResult({
            itemsTotal,
            itemsCompleted,
            currentItemCompleted,
          });
        }
      }
    }
    itemsCompleted += 1;

    // Purge all collections
    for (const collection of COLLECTIONS_TO_PURGE) {
      signal.throwIfAborted();
      Logger.info("purgeHunt: removing from collection", {
        collection: collection.name,
      });
      const castCollection = collection as unknown as Model<
        z.ZodObject<{ hunt: z.ZodString }>
      >;
      await castCollection.removeAsync({ hunt: args.huntId });
      itemsCompleted += 1;
      await setResult({
        itemsTotal,
        itemsCompleted,
      });
    }
  },
});
