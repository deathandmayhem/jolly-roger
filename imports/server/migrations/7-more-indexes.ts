import MeteorUsers from "../../lib/models/MeteorUsers";
import Migrations from "./Migrations";

Migrations.add({
  version: 7,
  name: "Add more missing indexes",
  async up() {
    await MeteorUsers.createIndexAsync({ hunts: 1 });
  },
});
