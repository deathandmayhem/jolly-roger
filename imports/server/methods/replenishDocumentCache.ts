import { Meteor } from "meteor/meteor";
import CachedDocuments from "../../lib/models/CachedDocuments";
import Hunts from "../../lib/models/Hunts";
import { createDocument, ensureHuntFolder } from "../gdrive";
import Logger from "../../Logger"; // Assuming this is your logger import
import MeteorUsers from "../../lib/models/MeteorUsers";

const TARGETS = {
  spreadsheet: 15,
  document: 1,
} as const;

const MINIMUM_USAGE = 3;

const sleep = (ms: number) =>
  new Promise((resolve) => Meteor.setTimeout(resolve, ms));

let globalQueue = Promise.resolve();

export async function checkAndReplenishDocumentCache(huntId: string) {
  const systemUser = await MeteorUsers.findOneAsync(
    { "roles.__GLOBAL__": "admin" },
    { sort: { createdAt: 1 } },
  );

  if (!systemUser) {
    Logger.error("Replenishment aborted: No global admin user found.");
    return;
  }

  const systemUserId = systemUser._id;

  globalQueue = globalQueue
    .then(async () => {
      const hunt = await Hunts.findOneAsync(huntId);
      if (!hunt) {
        Logger.warn("Replenishment aborted: Hunt not found", { huntId });
        return;
      }

      const folderId = await ensureHuntFolder(hunt);

      for (const [docType, targetCount] of Object.entries(TARGETS)) {
        const type = docType as keyof typeof TARGETS;

        const currentCount = await CachedDocuments.find({
          hunt: huntId,
          "value.type": type,
          status: "available",
        }).countAsync();

        if (
          currentCount < targetCount - MINIMUM_USAGE ||
          (currentCount < MINIMUM_USAGE && currentCount < targetCount)
        ) {
          const needed = targetCount - currentCount;

          for (let i = 0; i < needed; i++) {
            try {
              const placeholderName = `[CACHED] ${type.toUpperCase()} - DO NOT DELETE`;

              const googleDocId = await createDocument(
                placeholderName,
                type,
                folderId,
              );

              await CachedDocuments.insertAsync({
                hunt: huntId,
                status: "available",
                provider: "google",
                value: {
                  type,
                  id: googleDocId,
                  folder: folderId,
                },
                createdAt: new Date(),
                createdBy: systemUserId,
              } as any);
              await sleep(1500);
            } catch (err) {
              Logger.error(`Critical error during ${type} replenishment`, {
                huntId,
                error: err,
              });
              break;
            }
          }
        }
      }
    })
    .catch((err) => {
      Logger.error("Global Replenishment Queue Error", { huntId, error: err });
    });
}
