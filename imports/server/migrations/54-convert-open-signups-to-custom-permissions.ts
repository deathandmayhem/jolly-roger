import Hunts from "../../lib/models/Hunts";
import Migrations from "./Migrations";

const DEFAULT_PERMISSION_LEVELS_FOR_MIGRATION = {
  inviteUsers: "operator",
  bulkInviteUsers: "operator",
  manageOperators: "operator",
  manageInvitationLink: "operator",
  editPuzzles: "operator",
  deletePuzzles: "operator",
  operateGuessQueue: "operator",
  sendAnnouncements: "operator",
  purgeHunt: "hunt_owner",
} as const;

Migrations.add({
  version: 54,
  name: "Convert Hunts to custom permissions",
  async up() {
    for await (const hunt of Hunts.find({})) {
      if ((hunt as any).openSignups !== undefined) {
        // We wish to unset the deprecated openSignups field on all Hunts.
        // If openSignups was true, we should set up custom permissions where members may inviteUsers, not just operators.
        // If openSignups was false, we can use default permissions.
        if ((hunt as any).openSignups) {
          // openSignups true overrides the default inviteUsers permission to "member" instead of "operator"
          await Hunts.updateAsync(
            hunt._id,
            {
              $set: {
                customPermissions: {
                  ...DEFAULT_PERMISSION_LEVELS_FOR_MIGRATION,
                  inviteUsers: "member" as const,
                },
              },
              $unset: { openSignups: "" },
            },
            {
              bypassSchema: true,
            },
          );
        } else {
          // openSignups false is the default permission set, so we don't need to
          // set any customPermissions, just clear the deprecated openSignups
          await Hunts.updateAsync(
            hunt._id,
            { $unset: { openSignups: "" } },
            { bypassSchema: true },
          );
        }
      }
    }
  },
});
