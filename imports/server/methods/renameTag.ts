import { check } from "meteor/check";
import Logger from "../../Logger";
import Tags from "../../lib/models/Tags";
import renameTag from "../../methods/renameTag";
import defineMethod from "./defineMethod";

defineMethod(renameTag, {
  async run({ tagId, name }) {
    check(this.userId, String);

    const tag = await Tags.findOneAsync(tagId);
    if (tag) {
      Logger.info("Renaming tag", { tag: tagId, name });
      await Tags.updateAsync({ _id: tagId }, { $set: { name } });
    }
  },
});
