import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import type { HuntType } from "../../lib/models/Hunts";
import Hunts, { HuntPattern } from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import updateHunt from "../../methods/updateHunt";
import addUsersToDiscordRole from "../addUsersToDiscordRole";
import { ensureHuntFolder, huntFolderName, renameDocument } from "../gdrive";
import defineMethod from "./defineMethod";

defineMethod(updateHunt, {
  validate(arg) {
    check(arg, { huntId: String, value: HuntPattern });
    return arg;
  },

  async run({ huntId, value }) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const oldHunt = await Hunts.findOneAsync(huntId);
    if (!oldHunt) {
      throw new Meteor.Error(404, "Unknown hunt");
    }

    Logger.info("Updating hunt settings", { hunt: huntId, ...value });

    // $set will not remove keys from a document.  For that, we must specify
    // $unset on the appropriate key(s).  Split out which keys we must set and
    // unset to achieve the desired final state.
    const toSet: { [key in keyof HuntType]?: any } = {};
    const toUnset: { [key in keyof HuntType]?: "" } = {};
    Object.keys(HuntPattern).forEach((key: string) => {
      const typedKey = key as keyof typeof HuntPattern;
      if (value[typedKey] === undefined) {
        toUnset[typedKey] = "";
      } else {
        toSet[typedKey] = value[typedKey];
      }
    });

    await Hunts.updateAsync(
      { _id: huntId },
      {
        $set: toSet,
        $unset: toUnset,
      },
    );

    Meteor.defer(async () => {
      // Sync discord roles
      const userIds = (
        await MeteorUsers.find({ hunts: huntId }).fetchAsync()
      ).map((u) => u._id);
      await addUsersToDiscordRole(userIds, huntId, { force: false });

      if (oldHunt?.name !== value.name) {
        const folderId = await ensureHuntFolder({
          _id: huntId,
          name: value.name,
        });
        await renameDocument(folderId, await huntFolderName(value.name));
      }
    });
  },
});
