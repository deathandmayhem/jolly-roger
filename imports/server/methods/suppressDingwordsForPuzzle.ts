import { check, Match } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import suppressDingwordsForPuzzle from "../../methods/suppressDingwordsForPuzzle";
import defineMethod from "./defineMethod";

defineMethod(suppressDingwordsForPuzzle, {
  validate(arg) {
    check(arg, {
      puzzle: String,
      hunt: String,
      dingword: Match.Optional(String),
    });

    return arg;
  },

  async run({ puzzle, hunt, dingword }) {
    // Suppress dingword for a specific puzzle in a hunt
    check(this.userId, String);
    await MeteorUsers.updateAsync(
      {
        _id: this.userId,
      },
      {
        $addToSet: {
          [`suppressedDingwords.${hunt}.${puzzle}`]: dingword ?? "__ALL__",
        },
      },
    );
  },
});
