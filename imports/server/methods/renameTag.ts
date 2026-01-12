import { check } from "meteor/check";
import Logger from "../../Logger";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
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

    const existingTag = await Tags.findOneAsync({
      hunt: tag?.hunt,
      name,
    });
    if (existingTag) {
      Puzzles.updateAsync({ tags: tagId }, { $set: { tags: existingTag._id } });
      Puzzles.updateAsync({ tags: tagId }, { $pull: { tags: tagId } });
      Tags.removeAsync(tagId);
    } else if(tag) {
      Logger.info("Renaming tag", { tag: tagId, name });
      await Tags.updateAsync({ _id: tagId }, { $set: { name } });
    }
  },
});
