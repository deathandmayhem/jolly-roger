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
      alias: Boolean,
    });

    return arg;
  },

  async run({ tagId, name, alias }) {
    check(this.userId, String);

    const tag = await Tags.findOneAsync(tagId);

    const existingTag = await Tags.findOneAsync({
      $or: [{ name }, { aliases: name }],
      hunt: tag?.hunt,
    });

    if (alias) {
      Logger.info("Adding alias", {
        tag: existingTag._id ?? tagId,
        alias: tag.name,
      });
      await Tags.updateAsync(
        { _id: existingTag._id ?? tagId },
        { $addToSet: { aliases: tag.name } },
      );
    }
    if (existingTag) {
      Logger.info("Merging tag", { tag: tagId, existingTag: existingTag._id });
      await Puzzles.updateAsync(
        { tags: tagId },
        { $addToSet: { tags: existingTag._id } },
      );
      await Puzzles.updateAsync({ tags: tagId }, { $pull: { tags: tagId } });
      await Tags.removeAsync(tagId);
    } else if (tag) {
      Logger.info("Renaming tag", { tag: tagId, name });
      await Tags.updateAsync({ _id: tagId }, { $set: { name } });
    }
  },
});
