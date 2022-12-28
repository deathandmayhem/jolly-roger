import { check } from 'meteor/check';
import Ansible from '../../Ansible';
import Tags from '../../lib/models/Tags';
import renameTag from '../../methods/renameTag';

renameTag.define({
  validate(arg) {
    check(arg, {
      tagId: String,
      name: String,
    });

    return arg;
  },

  async run({ tagId, name }) {
    check(this.userId, String);

    const tag = await Tags.findOneAsync(tagId);
    if (tag) {
      Ansible.log('Renaming tag', { tag: tagId, name });
      await Tags.updateAsync({ _id: tagId }, { $set: { name } });
    }
  },
});
