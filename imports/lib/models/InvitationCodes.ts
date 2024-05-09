import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { foreignKey, nonEmptyString } from "./customTypes";
import withCommon from "./withCommon";

// Invitation codes that can be used to join a hunt.
// These take the place of direct (user-to-user) invitations.
export const InvitationCode = withCommon(
  z.object({
    hunt: foreignKey,
    code: nonEmptyString,
  }),
);

const InvitationCodes = new SoftDeletedModel(
  "jr_invitation_codes",
  InvitationCode,
);
InvitationCodes.addIndex({ hunt: 1 });
InvitationCodes.addIndex({ code: 1 });
export type InvitationCodeType = ModelType<typeof InvitationCodes>;

export default InvitationCodes;
