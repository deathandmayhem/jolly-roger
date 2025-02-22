import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import Hunts, { HuntPattern } from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { addUserToRole, checkAdmin } from "../../lib/permission_stubs";
import createHunt from "../../methods/createHunt";
import addUsersToDiscordRole from "../addUsersToDiscordRole";
import { ensureHuntFolder } from "../gdrive";
import getOrCreateTagByName from "../getOrCreateTagByName";
import defineMethod from "./defineMethod";
import Settings from "../../lib/models/Settings";

const DEFAULT_TAGS = [
  "is:meta",
  "is:metameta",
  "is:runaround",
  "priority:high",
  "priority:low",
  "group:events",
  "needs:extraction",
  "needs:onsite",
];

defineMethod(createHunt, {
  validate(arg) {
    check(arg, HuntPattern);
    return arg;
  },

  async run(arg) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    Logger.info("Creating a new hunt", arg);

    const huntId = await Hunts.insertAsync(arg);
    await addUserToRole(this.userId, huntId, "operator");

    const defaultTags = await Settings.findOneAsync({
      name: "server.settings",
    });

    const initialTags = defaultTags?.value.defaultHuntTags
      ? defaultTags.value.defaultHuntTags?.split(",")
      : DEFAULT_TAGS;

    for (const tag of initialTags) {
      await getOrCreateTagByName(huntId, tag.trim());
    }

    Meteor.defer(async () => {
      // Sync discord roles
      const userIds = (
        await MeteorUsers.find({ hunts: huntId }).fetchAsync()
      ).map((u) => u._id);
      await addUsersToDiscordRole(userIds, huntId);
      await ensureHuntFolder({ _id: huntId, name: arg.name });
    });

    return huntId;
  },
});
