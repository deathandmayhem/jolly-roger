import { Meteor, Subscription } from "meteor/meteor";
import { Random } from "meteor/random";
import { assert } from "chai";
import Guesses from "../../../../imports/lib/models/Guesses";
import Puzzles from "../../../../imports/lib/models/Puzzles";
import Tags from "../../../../imports/lib/models/Tags";
import makeFixtureHunt from "../../../../imports/server/makeFixtureHunt";
import publishJoinedQuery from "../../../../imports/server/publishJoinedQuery";
import resetDatabase from "../../../lib/resetDatabase";

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
  beforeEach(async function () {
    await resetDatabase("publishJoinedQuery");
    await makeFixtureHunt(Random.id());
  });

  it("can follow a string foreign key", async function () {
    const sub = new StubSubscription();
    after(() => sub.stop());

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
    after(() => sub.stop());

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
    after(() => sub.stop());

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

    const updatePropagated = new Promise<void>((resolve, reject) => {
      let handleThunk: Meteor.LiveQueryHandle | undefined;
      Puzzles.find(puzzleId)
        .observeChangesAsync({
          changed: () => {
            if (handleThunk) {
              handleThunk.stop();
              handleThunk = undefined;
              resolve();
            }
          },
        })
        .then(
          (handle) => {
            handleThunk = handle;
          },
          (error) => {
            reject(error);
          },
        );
      after(() => handleThunk?.stop());
    });

    await Puzzles.updateAsync(puzzleId, { $set: { tags: newTagIds } });
    // make sure the update has propagated to oplog watchers
    await updatePropagated;

    assert.sameMembers([...sub.data.keys()], [Puzzles.name, Tags.name]);

    const puzzleCollection = sub.data.get(Puzzles.name)!;
    assert.sameMembers([...puzzleCollection.keys()], [puzzleId]);

    const tagCollection = sub.data.get(Tags.name)!;

    // Give the sub an additional while to process the updated foreign keys,
    // since we wind up with a bunch of chained promises that have to be
    // awaited within JoinedObjectObserver to ensure we emit updates in the
    // right order, and that has to do some async mongo queries.  In local
    // testing, this generally completes within 10 turns and 2ms.
    for (let i = 0; i < 1000; i++) {
      // console.log(`tick ${i}`);
      await new Promise<void>((r) => {
        Meteor.defer(r);
      });
      // Exit early if condition is satisfied
      const observed = [...tagCollection.keys()];
      const newSortedTagIds = newTagIds.toSorted();
      if (
        observed.length === newTagIds.length &&
        observed.toSorted().every((val, j) => val === newSortedTagIds[j])
      ) {
        break;
      }
    }
    assert.sameMembers([...tagCollection.keys()], newTagIds);
  });
});
