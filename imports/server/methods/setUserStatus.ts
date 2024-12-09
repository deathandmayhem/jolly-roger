import { check, Match } from "meteor/check";
import setUserStatus from "../../methods/setUserStatus";
import defineMethod from "./defineMethod";
import { serverId } from "../garbage-collection";
import UserStatuses from "../../lib/models/UserStatuses";

defineMethod(setUserStatus, {
  validate(arg) {
    check(arg, {
      hunt: String,
      type: String,
      status: String,
      puzzle: Match.Maybe(String),
    });

    return arg;
  },

  async run({ hunt, type, status, puzzle }) {
    check(this.userId, String);

    const user = this.userId;

    let query = {
      hunt,
      user,
      type,
      server: serverId,
      connection: this.connection?.id,
    };

    if (puzzle) {
      query.puzzle = puzzle;
    }

    await UserStatuses.upsertAsync(
      query,
      {
        $set: {
          status: status,
        },
      },
    );
  },
});
