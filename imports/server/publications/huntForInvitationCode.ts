import { check } from "meteor/check";
import Hunts from "../../lib/models/Hunts";
import InvitationCodes from "../../lib/models/InvitationCodes";
import huntForInvitationCode from "../../lib/publications/huntForInvitationCode";
import publishJoinedQuery from "../publishJoinedQuery";
import definePublication from "./definePublication";

definePublication(huntForInvitationCode, {
  validate(arg) {
    check(arg, {
      invitationCode: String,
    });
    return arg;
  },
  async run({ invitationCode }) {
    await publishJoinedQuery(
      this,
      {
        model: InvitationCodes,
        foreignKeys: [
          {
            field: "hunt",
            join: {
              model: Hunts,
            },
          },
        ],
      },
      { code: invitationCode },
    );
    this.ready();

    return undefined;
  },
});
