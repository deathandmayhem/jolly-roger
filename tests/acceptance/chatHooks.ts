import { promisify } from "node:util";
import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import ChatMessages from "../../imports/lib/models/ChatMessages";
import chatMessagesForFirehose from "../../imports/lib/publications/chatMessagesForFirehose";
import createFixtureHunt from "../../imports/methods/createFixtureHunt";
import provisionFirstUser from "../../imports/methods/provisionFirstUser";
import setGuessState from "../../imports/methods/setGuessState";
import resetDatabase from "../lib/resetDatabase";
import { USER_EMAIL, USER_PASSWORD } from "./lib";

if (Meteor.isClient) {
  const typedSubscribe = require("../../imports/client/typedSubscribe")
    .default as typeof import("../../imports/client/typedSubscribe").default;

  describe("chat hooks", function () {
    describe("puzzle answer is marked correct", function () {
      it("sends a message to all linked metas", async function () {
        await resetDatabase("chat hooks puzzle answer is marked correct");

        await provisionFirstUser.callPromise({
          email: USER_EMAIL,
          password: USER_PASSWORD,
        });
        await promisify(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
        await createFixtureHunt.callPromise();

        const huntId = "S5BBzdFRnKSDktDwd";
        const guessId = "5bYkNpXBC2mAdZBDC";
        const puzzleId = "hiMpJHfWjotCGb9NT";
        const metaPuzzleIds = ["NeMxJZKPGqN7CcmcN", "3zTi6pDY9mHJSbLoS"];

        const before = new Date();
        await setGuessState.callPromise({ guessId, state: "correct" });

        await typedSubscribe.async(chatMessagesForFirehose, { huntId });
        const newMessages = await ChatMessages.find({
          createdAt: { $gt: before },
        }).fetchAsync();

        assert.sameMembers(
          newMessages.map((m) => m.puzzle),
          [...metaPuzzleIds, puzzleId],
          "New chat message should be sent to puzzle and all linked metas",
        );
      });
    });
  });
}
