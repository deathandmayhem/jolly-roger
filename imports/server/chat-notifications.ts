import { Meteor } from "meteor/meteor";
import Flags from "../Flags";
import ChatNotifications from "../lib/models/ChatNotifications";
import Hunts from "../lib/models/Hunts";
import MeteorUsers from "../lib/models/MeteorUsers";
import Puzzles from "../lib/models/Puzzles";
import publishJoinedQuery from "./publishJoinedQuery";

Meteor.publish("chatNotifications", async function () {
  if (!this.userId) {
    throw new Meteor.Error(401, "Not logged in");
  }

  if (await Flags.activeAsync("disable.dingwords")) {
    return;
  }

  await publishJoinedQuery(
    this,
    {
      model: ChatNotifications,
      foreignKeys: [
        {
          field: "hunt",
          join: { model: Hunts },
        },
        {
          field: "puzzle",
          join: { model: Puzzles },
        },
        {
          field: "sender",
          join: {
            model: MeteorUsers,
            projection: { displayName: 1 },
          },
        },
      ],
    },
    { user: this.userId },
  );
  this.ready();
});
