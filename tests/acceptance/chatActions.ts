import { promisify } from "node:util";
import { Accounts } from "meteor/accounts-base";
import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import ChatMessageRevisions from "../../imports/lib/models/ChatMessageRevisions";
import ChatMessages from "../../imports/lib/models/ChatMessages";
import chatMessagesForPuzzle from "../../imports/lib/publications/chatMessagesForPuzzle";
import createFixtureHunt from "../../imports/methods/createFixtureHunt";
import deleteChatMessage from "../../imports/methods/deleteChatMessage";
import editChatMessage from "../../imports/methods/editChatMessage";
import provisionFirstUser from "../../imports/methods/provisionFirstUser";
import sendChatMessage from "../../imports/methods/sendChatMessage";
import TypedMethod from "../../imports/methods/TypedMethod";
import resetDatabase from "../lib/resetDatabase";
import { USER_EMAIL, USER_PASSWORD } from "./lib";

const createUser = new TypedMethod<
  { email: string; password: string; hunts?: string[] },
  string
>("test.methods.chatActions.createUser");

const getRevisions = new TypedMethod<
  { chatMessageId: string },
  { _id: string; chatMessage: string; content: any }[]
>("test.methods.chatActions.getRevisions");

if (Meteor.isServer) {
  const defineMethod: typeof import("../../imports/server/methods/defineMethod").default =
    require("../../imports/server/methods/defineMethod").default;
  const MeteorUsers: typeof import("../../imports/lib/models/MeteorUsers").default =
    require("../../imports/lib/models/MeteorUsers").default;

  defineMethod(createUser, {
    validate(arg: unknown) {
      check(arg, {
        email: String,
        password: String,
        hunts: Match.Optional([String]),
      });
      return arg;
    },
    async run({ email, password, hunts }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }
      const userId = await Accounts.createUserAsync({ email, password });
      if (hunts) {
        await MeteorUsers.updateAsync(userId, { $set: { hunts } });
      }
      return userId;
    },
  });

  defineMethod(getRevisions, {
    validate(arg: unknown) {
      check(arg, {
        chatMessageId: String,
      });
      return arg;
    },
    async run({ chatMessageId }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }
      const revisions = await ChatMessageRevisions.find({
        chatMessage: chatMessageId,
      }).fetchAsync();
      return revisions;
    },
  });
}

if (Meteor.isClient) {
  const typedSubscribe = require("../../imports/client/typedSubscribe")
    .default as typeof import("../../imports/client/typedSubscribe").default;

  describe("chat actions", function () {
    const huntId = "S5BBzdFRnKSDktDwd";
    const puzzleId = "hiMpJHfWjotCGb9NT";

    beforeEach(async function () {
      await resetDatabase("chat actions");
      await provisionFirstUser.callPromise({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });
      await promisify(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
      await createFixtureHunt.callPromise();
      await typedSubscribe.async(chatMessagesForPuzzle, { puzzleId, huntId });
    });

    it("allows a user to edit their own message", async function () {
      await sendChatMessage.callPromise({
        puzzleId,
        content: JSON.stringify({
          type: "message",
          children: [{ text: "Original message" }],
        }),
      });

      const message = await ChatMessages.findOneAsync({ puzzle: puzzleId });
      assert.isDefined(message);

      await editChatMessage.callPromise({
        chatMessageId: message._id,
        content: JSON.stringify({
          type: "message",
          children: [{ text: "Edited message" }],
        }),
      });

      const updatedMessage = await ChatMessages.findOneAsync(message._id);
      assert.isDefined(updatedMessage);
      assert.deepEqual(updatedMessage.content, {
        type: "message",
        children: [{ text: "Edited message" }],
      });
      assert.isTrue(updatedMessage.edited);

      const revisions = await getRevisions.callPromise({
        chatMessageId: message._id,
      });
      assert.lengthOf(revisions, 1);
      assert.deepEqual(revisions[0]!.content, {
        type: "message",
        children: [{ text: "Original message" }],
      });
    });

    it("allows a user to delete their own message", async function () {
      await sendChatMessage.callPromise({
        puzzleId,
        content: JSON.stringify({
          type: "message",
          children: [{ text: "Message to delete" }],
        }),
      });

      const message = await ChatMessages.findOneAsync({ puzzle: puzzleId });
      assert.isDefined(message);

      await deleteChatMessage.callPromise({
        chatMessageId: message._id,
      });

      const deletedMessage = await ChatMessages.findOneAsync(message._id);
      assert.isDefined(deletedMessage);
      assert.isUndefined(deletedMessage.content);

      const revisions = await getRevisions.callPromise({
        chatMessageId: message._id,
      });
      assert.lengthOf(revisions, 1);
      assert.deepEqual(revisions[0]!.content, {
        type: "message",
        children: [{ text: "Message to delete" }],
      });
    });

    it("prevents editing a deleted message", async function () {
      await sendChatMessage.callPromise({
        puzzleId,
        content: JSON.stringify({
          type: "message",
          children: [{ text: "Original message" }],
        }),
      });

      const message = await ChatMessages.findOneAsync({ puzzle: puzzleId });
      assert.isDefined(message);

      await deleteChatMessage.callPromise({
        chatMessageId: message._id,
      });

      await assert.isRejected(
        editChatMessage.callPromise({
          chatMessageId: message._id,
          content: JSON.stringify({
            type: "message",
            children: [{ text: "New message" }],
          }),
        }),
        /Cannot edit a deleted message/,
      );
    });

    it("prevents deleting an already deleted message", async function () {
      await sendChatMessage.callPromise({
        puzzleId,
        content: JSON.stringify({
          type: "message",
          children: [{ text: "Message" }],
        }),
      });

      const message = await ChatMessages.findOneAsync({ puzzle: puzzleId });
      assert.isDefined(message);

      await deleteChatMessage.callPromise({
        chatMessageId: message._id,
      });

      await assert.isRejected(
        deleteChatMessage.callPromise({
          chatMessageId: message._id,
        }),
        /Cannot edit a deleted message/,
      );
    });

    it("prevents editing someone else's message", async function () {
      await sendChatMessage.callPromise({
        puzzleId,
        content: JSON.stringify({
          type: "message",
          children: [{ text: "User 1 message" }],
        }),
      });

      const message = await ChatMessages.findOneAsync({ puzzle: puzzleId });
      assert.isDefined(message);

      // Create and login as second user
      const otherEmail = "other@example.com";
      const otherPassword = "password456";
      await createUser.callPromise({
        email: otherEmail,
        password: otherPassword,
        hunts: [huntId],
      });
      await promisify(Meteor.loginWithPassword)(otherEmail, otherPassword);

      await assert.isRejected(
        editChatMessage.callPromise({
          chatMessageId: message._id,
          content: JSON.stringify({
            type: "message",
            children: [{ text: "Malicious edit" }],
          }),
        }),
        /You can only edit your own messages/,
      );
    });

    it("prevents deleting someone else's message", async function () {
      await sendChatMessage.callPromise({
        puzzleId,
        content: JSON.stringify({
          type: "message",
          children: [{ text: "User 1 message" }],
        }),
      });

      const message = await ChatMessages.findOneAsync({ puzzle: puzzleId });
      assert.isDefined(message);

      // Create and login as second user
      const otherEmail = "other@example.com";
      const otherPassword = "password456";
      await createUser.callPromise({
        email: otherEmail,
        password: otherPassword,
        hunts: [huntId],
      });
      await promisify(Meteor.loginWithPassword)(otherEmail, otherPassword);

      await assert.isRejected(
        deleteChatMessage.callPromise({
          chatMessageId: message._id,
        }),
        /You can only edit your own messages/,
      );
    });
  });
}
