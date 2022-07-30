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

  run({ tagId, name }) {
    check(this.userId, String);

    const tag = Tags.findOne(tagId);
    if (tag) {
      Ansible.log('Renaming tag', { tag: tagId, name });
      Tags.update({ _id: tagId }, { $set: { name } });
    }
  },
});
