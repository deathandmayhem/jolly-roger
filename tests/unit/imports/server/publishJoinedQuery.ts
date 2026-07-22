import type { Meteor, Subscription } from "meteor/meteor";
import { Random } from "meteor/random";
import { assert } from "chai";
import Guesses from "../../../../imports/lib/models/Guesses";
import Puzzles from "../../../../imports/lib/models/Puzzles";
import Tags from "../../../../imports/lib/models/Tags";
import makeFixtureHunt from "../../../../imports/server/makeFixtureHunt";
import publishJoinedQuery from "../../../../imports/server/publishJoinedQuery";
import resetDatabase from "../../../lib/resetDatabase";
import waitForAssertion from "../../../lib/waitForAssertion";
import withWriteFence from "../../../lib/withWriteFence";

class StubSubscription implements Subscription {
  stopHooks: (() => void)[] = [];

  onStop(func: () => void): void {
    this.stopHooks.push(func);
  }

  data: Map<
    string /* collection */,
    Map<string /* id */, Record<string, any> /* fields */>
  > = new Map();

  added(collection: string, id: string, fields: Record<string, any>): void {
    let collectionMap = this.data.get(collection);
    if (!collectionMap) {
      collectionMap = new Map();
      this.data.set(collection, collectionMap);
    }
    collectionMap.set(id, fields);
  }

  changed(collection: string, id: string, fields: Record<string, any>): void {
    const collectionMap = this.data.get(collection);
    if (!collectionMap) {
      throw new Error(`Collection ${collection} not found`);
    }
    const doc = collectionMap.get(id);
    if (!doc) {
      throw new Error(`Document ${id} not found in collection ${collection}`);
    }
    collectionMap.set(id, { ...doc, ...fields });
  }

  removed(collection: string, id: string): void {
    const collectionMap = this.data.get(collection);
    if (!collectionMap) {
      throw new Error(`Collection ${collection} not found`);
    }
    if (!collectionMap.delete(id)) {
      throw new Error(`Document ${id} not found in collection ${collection}`);
    }
  }

  ready() {
    /* noop */
  }

  stop() {
    this.stopHooks.forEach((hook) => hook());
  }

  error(_error: Error) {
    /* noop */
  }

  unblock() {
    /* noop */
  }

  userId: string | null = null;

  get connection(): Meteor.Connection {
    throw new Error("Method not implemented.");
  }
}

describe("publishJoinedQuery", function () {
  // Stop observers per-test: a leftover observer would share its multiplexer
  // with a later test's identical query, seeding it from a cache that can lag
  // the beforeEach writes rather than from a fresh fetch.
  let stopFns: (() => void)[] = [];
  afterEach(function () {
    stopFns.forEach((fn) => {
      fn();
    });
    stopFns = [];
  });

  beforeEach(async function () {
    await resetDatabase("publishJoinedQuery");
    await makeFixtureHunt(Random.id());
  });

  it("can follow a string foreign key", async function () {
    const sub = new StubSubscription();
    stopFns.push(() => sub.stop());

    const guessId = "obeeKs3ZEkBe3ykeg";
    const puzzleId = "fXchzrh8X9EoSZu6k";

    await publishJoinedQuery(
      sub,
      {
        model: Guesses,
        foreignKeys: [
          {
            field: "puzzle",
            join: {
              model: Puzzles,
            },
          },
        ],
      },
      { _id: guessId },
    );

    assert.sameMembers([...sub.data.keys()], [Puzzles.name, Guesses.name]);

    const guessCollection = sub.data.get(Guesses.name)!;
    assert.sameMembers([...guessCollection.keys()], [guessId]);

    const puzzleCollection = sub.data.get(Puzzles.name)!;
    assert.sameMembers([...puzzleCollection.keys()], [puzzleId]);
  });

  it("can follow an array foreign key", async function () {
    const sub = new StubSubscription();
    stopFns.push(() => sub.stop());

    const puzzleId = "fXchzrh8X9EoSZu6k";
    const tagIds = ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"];

    await publishJoinedQuery(
      sub,
      {
        model: Puzzles,
        foreignKeys: [
          {
            field: "tags",
            join: {
              model: Tags,
            },
          },
        ],
      },
      { _id: puzzleId },
    );

    assert.sameMembers([...sub.data.keys()], [Puzzles.name, Tags.name]);

    const puzzleCollection = sub.data.get(Puzzles.name)!;
    assert.sameMembers([...puzzleCollection.keys()], [puzzleId]);

    const tagCollection = sub.data.get(Tags.name)!;
    assert.sameMembers([...tagCollection.keys()], tagIds);
  });

  it("updates if foreign keys change", async function () {
    const sub = new StubSubscription();
    stopFns.push(() => sub.stop());

    const puzzleId = "fXchzrh8X9EoSZu6k";
    const newTagIds = ["NwhNGo64jRs384HwN", "27YauwyRpL6yMsCef"];

    await publishJoinedQuery(
      sub,
      {
        model: Puzzles,
        foreignKeys: [
          {
            field: "tags",
            join: {
              model: Tags,
            },
          },
        ],
      },
      { _id: puzzleId },
    );

    await withWriteFence(async () => {
      await Puzzles.updateAsync(puzzleId, { $set: { tags: newTagIds } });
    });

    assert.sameMembers([...sub.data.keys()], [Puzzles.name, Tags.name]);

    const puzzleCollection = sub.data.get(Puzzles.name)!;
    assert.sameMembers([...puzzleCollection.keys()], [puzzleId]);

    const tagCollection = sub.data.get(Tags.name)!;

    // The fence guarantees our observer saw the update, but the sub picks up
    // the new foreign keys through promise chains that run their own mongo
    // queries, so poll until the join converges.
    await waitForAssertion(() => {
      assert.sameMembers([...tagCollection.keys()], newTagIds);
    });
  });
});
