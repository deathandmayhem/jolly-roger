import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { addUserToRole } from "../../lib/permission_stubs";
import Migrations from "./Migrations";

Migrations.add({
  version: 53,
  name: "Backfill hunt_owner role on creators of Hunts",
  async up() {
    for await (const hunt of Hunts.find({})) {
      if (hunt.createdBy) {
        const creator = await MeteorUsers.findOneAsync(hunt.createdBy);
        if (creator) {
          await addUserToRole(hunt.createdBy, hunt._id, "hunt_owner");
        }
      }
    }
  },
});
