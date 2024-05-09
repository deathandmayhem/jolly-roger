import { check } from "meteor/check";
import Hunts from "../../lib/models/Hunts";
import InvitationCodes from "../../lib/models/InvitationCodes";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayAddUsersToHunt } from "../../lib/permission_stubs";
import invitationCodesForHunt from "../../lib/publications/invitationCodesForHunt";
import definePublication from "./definePublication";

definePublication(invitationCodesForHunt, {
  validate(arg) {
    check(arg, {
      huntId: String,
    });
    return arg;
  },

  async run({ huntId }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    const hunt = await Hunts.findOneAsync({ _id: huntId });
    if (!userMayAddUsersToHunt(user, hunt)) {
      return [];
    }

    return InvitationCodes.find({
      hunt: huntId,
    });
  },
});
