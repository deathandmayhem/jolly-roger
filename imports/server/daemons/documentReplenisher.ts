import { Meteor } from "meteor/meteor";
import Hunts from "../../lib/models/Hunts";
import { checkAndReplenishDocumentCache } from "../methods/replenishDocumentCache";
import Logger from "../../Logger";

export default function () {
  Meteor.startup(async () => {
    const activeHunts = await Hunts.find({}).fetchAsync();
    Logger.info("Replenishing document cache for all hunts", {
      hunts: activeHunts.map((h) => h._id),
    });
    for (const hunt of activeHunts) {
      Meteor.defer(async () => {
        try {
          await checkAndReplenishDocumentCache(hunt._id);
        } catch (e) {
          Logger.error("Failed initial cache replenishment", {
            huntId: hunt._id,
            error: e,
          });
        }
      });
    }
  });

  Meteor.setInterval(
    async () => {
      const activeHunts = await Hunts.find({}).fetchAsync();
      for (const hunt of activeHunts) {
        Meteor.defer(async () => {
          try {
            await checkAndReplenishDocumentCache(hunt._id);
          } catch (e) {
            Logger.error("Failed interval cache replenishment", {
              huntId: hunt._id,
              error: e,
            });
          }
        });
      }
    },
    13 * 60 * 1000,
  );
}