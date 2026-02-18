import { Accounts } from "meteor/accounts-base";
import { Random } from "meteor/random";
import { assert } from "chai";
import sinon from "sinon";
import mergeUsers from "../../../../imports/lib/jobs/mergeUsers";
import Bookmarks from "../../../../imports/lib/models/Bookmarks";
import ChatMessages, {
  type ChatMessageMentionNodeType,
} from "../../../../imports/lib/models/ChatMessages";
import MergeOperations from "../../../../imports/lib/models/MergeOperations";
import MeteorUsers from "../../../../imports/lib/models/MeteorUsers";
import enqueueJob from "../../../../imports/server/jobs/framework/enqueueJob";
import resetDatabase from "../../../lib/resetDatabase";
import runJob from "../../../lib/runJob";

async function createUser(
  email: string,
  displayName: string,
  extraEmails?: { address: string; verified: boolean }[],
): Promise<string> {
  const userId = await Accounts.createUserAsync({
    email,
    password: "password",
  });
  await MeteorUsers.updateAsync(userId, { $set: { displayName } });

  if (extraEmails) {
    for (const extra of extraEmails) {
      // Use $push directly rather than Accounts.addEmailAsync, which
      // requires a DDP method context for authorization.
      await MeteorUsers.updateAsync(userId, {
        $push: {
          emails: { address: extra.address, verified: extra.verified },
        },
      });
    }
  }

  return userId;
}

function runMergeJob(sourceUser: string, targetUser: string) {
  return runJob(mergeUsers, { sourceUser, targetUser }, { userId: targetUser });
}

describe("user merge", function () {
  this.timeout(30000);

  afterEach(() => sinon.restore());

  it("merges source user into target and deletes source", async function () {
    await resetDatabase("merge basic");

    const sourceId = await createUser("source@example.com", "Source User");
    const targetId = await createUser("target@example.com", "Target User");

    await MeteorUsers.updateAsync(targetId, {
      $set: {
        dingwords: ["sudoku"],
      },
    });

    await MeteorUsers.updateAsync(sourceId, {
      $set: {
        dingwords: ["puzzle", "crossword"],
        phoneNumber: "555-1234",
      },
    });

    await runMergeJob(sourceId, targetId);

    // Source should be deleted
    const source = await MeteorUsers.findOneAsync(sourceId);
    assert.isUndefined(source, "Source user should be deleted");

    // Target should inherit source's data
    const target = await MeteorUsers.findOneAsync(targetId);
    assert.isDefined(target);
    const dingwords = target!.dingwords ?? [];
    assert.include(dingwords, "puzzle", "Target should have source dingword");
    assert.include(
      dingwords,
      "crossword",
      "Target should have source dingword",
    );
    assert.include(dingwords, "sudoku", "Target should keep its own dingword");

    // MergeOperation should be marked complete
    const op = await MergeOperations.findOneAsync({
      participants: [sourceId, targetId],
    });
    assert.isDefined(op);
    assert.isDefined(op!.completedAt);
    assert.isDefined(op!.snapshot);
  });

  it("merges emails from source to target", async function () {
    await resetDatabase("merge emails");

    // Source has two emails, both verified.
    const sourceId = await createUser("source@example.com", "Source", [
      { address: "source-extra@example.com", verified: true },
    ]);
    await MeteorUsers.updateAsync(sourceId, {
      $set: { "emails.0.verified": true },
    });

    // Target has one email, unverified.
    const targetId = await createUser("target-primary@example.com", "Target");

    await runMergeJob(sourceId, targetId);

    const target = await MeteorUsers.findOneAsync(targetId);
    assert.isDefined(target);

    const emails = target!.emails ?? [];

    // Target should keep its own email
    const targetEmail = emails.find(
      (e) => e.address === "target-primary@example.com",
    );
    assert.isDefined(targetEmail, "Target's own email should be preserved");

    // Source's emails should be added
    const sourceEmail = emails.find((e) => e.address === "source@example.com");
    assert.isDefined(sourceEmail, "Source email should be added to target");
    assert.isTrue(sourceEmail!.verified, "Source email should stay verified");

    const sourceExtra = emails.find(
      (e) => e.address === "source-extra@example.com",
    );
    assert.isDefined(
      sourceExtra,
      "Source extra email should be added to target",
    );
  });

  it("handles hunts merge via addToSet", async function () {
    await resetDatabase("merge hunts");

    const sourceId = await createUser("source@example.com", "Source");
    const targetId = await createUser("target@example.com", "Target");

    // Use real-looking IDs since hunts is foreignKey.array()
    const hunt1 = Random.id();
    const hunt2 = Random.id();
    const hunt3 = Random.id();
    const hunt4 = Random.id();

    await MeteorUsers.updateAsync(sourceId, {
      $set: { hunts: [hunt1, hunt2, hunt3] },
    });
    await MeteorUsers.updateAsync(targetId, {
      $set: { hunts: [hunt2, hunt4] },
    });

    await runMergeJob(sourceId, targetId);

    const target = await MeteorUsers.findOneAsync(targetId);
    assert.isDefined(target);

    const hunts = target!.hunts ?? [];
    assert.include(hunts, hunt1);
    assert.include(hunts, hunt2);
    assert.include(hunts, hunt3);
    assert.include(hunts, hunt4);
    assert.lengthOf(hunts, 4, "Hunts should be merged without duplicates");
  });

  it("preserves target displayName over source", async function () {
    await resetDatabase("merge displayName");

    const sourceId = await createUser("source@example.com", "Source Name");
    const targetId = await createUser("target@example.com", "Target Name");

    await runMergeJob(sourceId, targetId);

    const target = await MeteorUsers.findOneAsync(targetId);
    assert.equal(
      target!.displayName,
      "Target Name",
      "Target's displayName should be preserved",
    );
  });

  it("fills target displayName from source if absent", async function () {
    await resetDatabase("merge displayName absent");

    const sourceId = await createUser("source@example.com", "Source Name");
    const targetId = await createUser("target@example.com", "Target Name");

    // Remove target's displayName entirely (can't set to "" — schema
    // requires nonEmptyString).
    await MeteorUsers.updateAsync(targetId, {
      $unset: { displayName: "" },
    });

    await runMergeJob(sourceId, targetId);

    const target = await MeteorUsers.findOneAsync(targetId);
    assert.equal(
      target!.displayName,
      "Source Name",
      "Source's displayName should fill absent target displayName",
    );
  });

  it("retries idempotently after failure before source deletion", async function () {
    await resetDatabase("merge idempotency");

    const sourceId = await createUser("source@example.com", "Source");
    const targetId = await createUser("target@example.com", "Target");

    const hunt1 = Random.id();
    await MeteorUsers.updateAsync(sourceId, {
      $set: { hunts: [hunt1], dingwords: ["puzzle"] },
    });
    await MeteorUsers.updateAsync(targetId, {
      $set: { hunts: [hunt1] },
    });

    const args = { sourceUser: sourceId, targetUser: targetId };
    const jobId = await enqueueJob(mergeUsers, args);
    const run = () => runJob(mergeUsers, args, { userId: targetId, jobId });

    // Stub removeAsync to fail on the first call, simulating a crash
    // after all data has been transferred but before source deletion.
    const removeStub = sinon.stub(MeteorUsers, "removeAsync").callThrough();
    removeStub.onFirstCall().rejects(new Error("Simulated crash"));

    // First run: should throw at the removeAsync step.
    try {
      await run();
      assert.fail("Expected first run to throw");
    } catch (e: any) {
      assert.match(e.message, /Simulated crash/);
    }

    removeStub.restore();

    // Second run: all idempotent guards should prevent duplication.
    await run();

    // Source should be deleted.
    const source = await MeteorUsers.findOneAsync(sourceId);
    assert.isUndefined(source, "Source user should be deleted");

    // Target should have the merged data without duplication.
    const target = await MeteorUsers.findOneAsync(targetId);
    assert.isDefined(target);

    const hunts = target!.hunts ?? [];
    assert.include(hunts, hunt1);
    assert.equal(
      hunts.filter((h) => h === hunt1).length,
      1,
      "hunt1 should not be duplicated",
    );

    const dingwords = target!.dingwords ?? [];
    assert.include(dingwords, "puzzle");
    assert.equal(
      dingwords.filter((d) => d === "puzzle").length,
      1,
      "dingword should not be duplicated",
    );

    const emails = target!.emails ?? [];
    assert.equal(
      emails.filter((e) => e.address === "source@example.com").length,
      1,
      "Source email should not be duplicated",
    );

    // MergeOperation should be marked complete.
    const mo = await MergeOperations.collection
      .rawCollection()
      .findOne({ job: jobId, completedAt: { $exists: true } });
    assert.isDefined(mo, "MergeOperation should have completedAt set");
  });

  it("recovers from snapshot after unique fields are cleared", async function () {
    await resetDatabase("merge snapshot recovery");

    const sourceId = await createUser("source@example.com", "Source");
    const targetId = await createUser("target@example.com", "Target");

    // Verify source email so we can test verified status preservation.
    await MeteorUsers.updateAsync(sourceId, {
      $set: { "emails.0.verified": true },
    });

    const args = { sourceUser: sourceId, targetUser: targetId };
    const jobId = await enqueueJob(mergeUsers, args);

    const updateStub = sinon.stub(MeteorUsers, "updateAsync").callThrough();
    updateStub
      .withArgs(sinon.match.any, sinon.match.hasNested("$unset.emails"))
      .callsFake(async (...args) => {
        // Simulate a crash right after the source's emails are cleared but
        // before they're added to the target.
        await updateStub.wrappedMethod.apply(MeteorUsers, args);
        throw new Error("Simulated crash");
      });

    // First run: throw after unique fields are cleared from the source
    // but before they're transferred to the target. This is the scenario
    // the snapshot is designed to survive.
    try {
      await runJob(mergeUsers, args, { userId: targetId, jobId });
      assert.fail("Expected first run to throw");
    } catch (e: any) {
      assert.match(e.message, /Simulated crash/);
    }

    updateStub.restore();

    // Source's unique fields should be cleared at this point.
    const sourceAfterCrash = await MeteorUsers.findOneAsync(sourceId);
    assert.isDefined(sourceAfterCrash);
    assert.isUndefined(
      sourceAfterCrash!.emails,
      "Source emails should be cleared",
    );

    // Target should NOT have the source's email yet.
    const targetAfterCrash = await MeteorUsers.findOneAsync(targetId);
    const targetEmails = targetAfterCrash!.emails ?? [];
    assert.isUndefined(
      targetEmails.find((e) => e.address === "source@example.com"),
      "Source email should not be on target yet",
    );

    // Second run: should recover via the snapshot.
    await runJob(mergeUsers, args, { userId: targetId, jobId });

    // Source should be deleted.
    const source = await MeteorUsers.findOneAsync(sourceId);
    assert.isUndefined(source, "Source user should be deleted");

    // Target should have the source's email, recovered from snapshot.
    const target = await MeteorUsers.findOneAsync(targetId);
    assert.isDefined(target);
    const emails = target!.emails ?? [];
    const sourceEmail = emails.find((e) => e.address === "source@example.com");
    assert.isDefined(
      sourceEmail,
      "Source email should be recovered from snapshot",
    );
    assert.isTrue(
      sourceEmail!.verified,
      "Verified status should be preserved from snapshot",
    );
  });

  it("handles retry when source is already deleted", async function () {
    await resetDatabase("merge source deleted");

    const sourceId = await createUser("source@example.com", "Source");
    const targetId = await createUser("target@example.com", "Target");

    await MeteorUsers.updateAsync(sourceId, {
      $set: { dingwords: ["puzzle"] },
    });

    // First run: complete the merge fully.
    const args = { sourceUser: sourceId, targetUser: targetId };
    const jobId = await runJob(mergeUsers, args, { userId: targetId });

    // Simulate a crash after source deletion but before completedAt was
    // persisted: clear completedAt so the MergeOperation re-enters the
    // partial unique index.
    await MergeOperations.collection
      .rawCollection()
      .updateOne({ job: jobId }, { $unset: { completedAt: "" } });

    // Second run: source is gone, but MergeOperation has a snapshot,
    // so the job should take the early-return path without throwing.
    await runJob(mergeUsers, args, { userId: targetId, jobId });

    // MergeOperation should be marked complete again.
    const mo = await MergeOperations.collection
      .rawCollection()
      .findOne({ job: jobId, completedAt: { $exists: true } });
    assert.isDefined(mo, "MergeOperation should have completedAt set");
  });

  it("updates foreign key references to the source user", async function () {
    await resetDatabase("merge FK");

    const sourceId = await createUser("source@example.com", "Source");
    const targetId = await createUser("target@example.com", "Target");

    const huntId = Random.id();
    const puzzleId = Random.id();
    const now = new Date();

    // Insert a chat message sent by the source user, with a mention of the
    // source user in the content.
    await ChatMessages.collection.rawCollection().insertOne({
      _id: Random.id(),
      hunt: huntId,
      puzzle: puzzleId,
      content: {
        type: "message",
        children: [
          { text: "Hey " },
          { type: "mention", userId: sourceId },
          { text: " check this out" },
        ],
      },
      sender: sourceId,
      timestamp: now,
      createdBy: sourceId,
      updatedBy: sourceId,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    });

    await runMergeJob(sourceId, targetId);

    const msgs = await ChatMessages.collection
      .rawCollection()
      .find({ puzzle: puzzleId })
      .toArray();
    assert.equal(msgs.length, 1);
    const msg = msgs[0]!;

    assert.equal(msg.sender, targetId, "sender should point to target");
    assert.equal(msg.createdBy, targetId, "createdBy should point to target");
    assert.equal(msg.updatedBy, targetId, "updatedBy should point to target");

    // The @-mention inside content.children should also be updated.
    const mention = msg.content.children.find(
      (c): c is ChatMessageMentionNodeType =>
        "type" in c && c.type === "mention",
    );
    assert.isDefined(mention);
    assert.equal(
      mention!.userId,
      targetId,
      "Mention userId should point to target",
    );
  });

  it("resolves unique FK conflicts by deleting the source's record", async function () {
    await resetDatabase("merge unique FK");

    const sourceId = await createUser("source@example.com", "Source");
    const targetId = await createUser("target@example.com", "Target");

    const huntId = Random.id();
    const puzzleId = Random.id();
    const now = new Date();

    // Both users have a bookmark for the same hunt+puzzle. The unique index
    // on { user, hunt, puzzle } means reassigning the source's bookmark to
    // the target would conflict.
    const bookmarkFields = (userId: string) => ({
      _id: Random.id(),
      hunt: huntId,
      puzzle: puzzleId,
      user: userId,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    });
    await Bookmarks.collection
      .rawCollection()
      .insertOne(bookmarkFields(sourceId));
    await Bookmarks.collection
      .rawCollection()
      .insertOne(bookmarkFields(targetId));

    await runMergeJob(sourceId, targetId);

    // The source's conflicting bookmark should have been deleted rather than
    // causing an error. Only the target's bookmark should remain.
    const bookmarks = await Bookmarks.collection
      .rawCollection()
      .find({ hunt: huntId, puzzle: puzzleId })
      .toArray();
    assert.equal(bookmarks.length, 1, "Only one bookmark should remain");
    assert.equal(
      bookmarks[0]!.user,
      targetId,
      "Remaining bookmark should belong to target",
    );
  });
});
