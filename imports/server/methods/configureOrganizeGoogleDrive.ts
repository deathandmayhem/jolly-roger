import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import Ansible from '../../Ansible';
import Documents from '../../lib/models/Documents';
import Hunts from '../../lib/models/Hunts';
import Puzzles from '../../lib/models/Puzzles';
import Settings from '../../lib/models/Settings';
import { userMayConfigureGdrive } from '../../lib/permission_stubs';
import { SettingType } from '../../lib/schemas/Setting';
import configureOrganizeGoogleDrive from '../../methods/configureOrganizeGoogleDrive';
import { moveDocument, ensureHuntFolder, ensureDocument } from '../gdrive';
import HuntFolders from '../models/HuntFolders';

configureOrganizeGoogleDrive.define({
  async run() {
    check(this.userId, String);

    // Only let the same people that can credential gdrive reorganize files,
    // which today is just admins
    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }

    Ansible.log('Reorganizing Google Drive files');

    // First make sure any existing folders are under the root
    const root = Settings.findOne({ name: 'gdrive.root' }) as SettingType & { name: 'gdrive.root' } | undefined;
    if (root) {
      await HuntFolders.find().fetch().reduce(async (promise, hf) => {
        await promise;
        await moveDocument(hf.folder, root.value.id);
      }, Promise.resolve());
    }

    // Then create folders for any hunt that doesn't currently have one
    await Hunts.find().fetch().reduce(async (promise, h) => {
      await promise;
      await ensureHuntFolder(h);
    }, Promise.resolve());

    // Finally move all existing documents into the right folder
    const puzzles = _.indexBy(Puzzles.find().fetch(), '_id');
    await Documents.find().fetch().reduce(async (promise, d) => {
      await promise;
      const puzzle = puzzles[d.puzzle];
      if (puzzle && !d.value.folder) await ensureDocument(puzzle);
    }, Promise.resolve());
  },
});
