import MeteorUsers from "../../lib/models/MeteorUsers";
import Migrations from "./Migrations";

Migrations.add({
  version: 53,
  name: "Add index on formerHunts",
  async up() {
    await MeteorUsers.createIndexAsync({ formerHunts: 1 });
  },
});
