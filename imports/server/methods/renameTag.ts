import { check } from "meteor/check";

import Tags from "../../lib/models/Tags";
import Logger from "../../Logger";
import renameTag from "../../methods/renameTag";
import defineMethod from "./defineMethod";

defineMethod(renameTag, {
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
      Logger.info("Renaming tag", { tag: tagId, name });
      await Tags.updateAsync({ _id: tagId }, { $set: { name } });
    }
  },
});
