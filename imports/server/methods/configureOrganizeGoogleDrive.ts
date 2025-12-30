import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import { indexedById } from "../../lib/listUtils";
import Documents from "../../lib/models/Documents";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import Settings from "../../lib/models/Settings";
import { userMayConfigureGdrive } from "../../lib/permission_stubs";
import configureOrganizeGoogleDrive from "../../methods/configureOrganizeGoogleDrive";
import { ensureDocument, ensureHuntFolder, moveDocument } from "../gdrive";
import HuntFolders from "../models/HuntFolders";
import defineMethod from "./defineMethod";

defineMethod(configureOrganizeGoogleDrive, {
  async run() {
    check(this.userId, String);

    // Only let the same people that can credential gdrive reorganize files,
    // which today is just admins
    if (!userMayConfigureGdrive(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin to configure gdrive");
    }

    Logger.info("Reorganizing Google Drive files");

    // First make sure any existing folders are under the root
    const root = await Settings.findOneAsync({ name: "gdrive.root" });
    if (root) {
      for (const hf of HuntFolders.find()) {
        await moveDocument(hf.folder, root.value.id);
      }
    }

    // Then create folders for any hunt that doesn't currently have one
    for (const h of Hunts.find()) {
      await ensureHuntFolder(h);
    }

    // Finally move all existing documents into the right folder
    const puzzles = indexedById(await Puzzles.find().fetchAsync());
    for (const d of Documents.find()) {
      const puzzle = puzzles.get(d.puzzle);
      if (puzzle && !d.value.folder) await ensureDocument(this.userId, puzzle);
    }
  },
});
