import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo, MongoInternals } from 'meteor/mongo';
import { Random } from 'meteor/random';
import { assert } from 'chai';
import Guesses from '../../../../imports/lib/models/Guesses';
import Hunts from '../../../../imports/lib/models/Hunts';
import Puzzles from '../../../../imports/lib/models/Puzzles';
import Tags from '../../../../imports/lib/models/Tags';
import makeFixtureHunt from '../../../../imports/server/makeFixtureHunt';
import publishJoinedQuery from '../../../../imports/server/publishJoinedQuery';

const { MongoError } = MongoInternals.NpmModules.mongodb.module;

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

  ready() { /* noop */ }

  stop() {
    this.stopHooks.forEach((hook) => hook());
  }

  error(_error: Error) { /* noop */ }

  unblock() { /* noop */ }

  userId: string | null = null;

  get connection(): Meteor.Connection {
    throw new Error('Method not implemented.');
  }
}

const safeDrop = async (collection: Mongo.Collection<any>) => {
  try {
    await collection.dropCollectionAsync();
  } catch (e) {
    if (!(e instanceof MongoError) || e.code !== 26) {
      throw e;
    }
  }
};

describe('publishJoinedQuery', function () {
  beforeEach(async function () {
    await Promise.all([
      safeDrop(Hunts),
      safeDrop(Puzzles),
      safeDrop(Guesses.collection),
      safeDrop(Tags),
    ]);
    await makeFixtureHunt(Random.id());
  });

  it('can follow a string foreign key', function () {
    const sub = new StubSubscription();
    after(() => sub.stop());

    const guessId = 'obeeKs3ZEkBe3ykeg';
    const puzzleId = 'fXchzrh8X9EoSZu6k';

    publishJoinedQuery(sub, {
      model: Guesses,
      foreignKeys: [{
        field: 'puzzle',
        join: {
          model: Puzzles,
        },
      }],
    }, { _id: guessId });

    assert.sameMembers([...sub.data.keys()], [Puzzles._name, Guesses.name]);

    const guessCollection = sub.data.get(Guesses.name)!;
    assert.sameMembers([...guessCollection.keys()], [guessId]);

    const puzzleCollection = sub.data.get(Puzzles._name)!;
    assert.sameMembers([...puzzleCollection.keys()], [puzzleId]);
  });

  it('can follow an array foreign key', function () {
    const sub = new StubSubscription();
    after(() => sub.stop());

    const puzzleId = 'fXchzrh8X9EoSZu6k';
    const tagIds = ['o5JdfTizW4tGwhRnP', 'QeJLufdCqv7rMSSbS'];

    publishJoinedQuery(sub, {
      model: Puzzles,
      foreignKeys: [{
        field: 'tags',
        join: {
          model: Tags,
        },
      }],
    }, { _id: puzzleId });

    assert.sameMembers([...sub.data.keys()], [Puzzles._name, Tags._name]);

    const puzzleCollection = sub.data.get(Puzzles._name)!;
    assert.sameMembers([...puzzleCollection.keys()], [puzzleId]);

    const tagCollection = sub.data.get(Tags._name)!;
    assert.sameMembers([...tagCollection.keys()], tagIds);
  });

  it('updates if foreign keys change', async function () {
    const sub = new StubSubscription();
    after(() => sub.stop());

    const puzzleId = 'fXchzrh8X9EoSZu6k';
    const newTagIds = ['NwhNGo64jRs384HwN', '27YauwyRpL6yMsCef'];

    publishJoinedQuery(sub, {
      model: Puzzles,
      foreignKeys: [{
        field: 'tags',
        join: {
          model: Tags,
        },
      }],
    }, { _id: puzzleId });

    const updatePropagated = new Promise<void>((r) => {
      let initializing = true;
      const handle = Puzzles.find(puzzleId).observeChanges({
        changed: () => {
          if (!initializing) {
            handle.stop();
            r();
          }
        },
      });
      after(() => handle.stop());
      initializing = false;
    });

    await Puzzles.updateAsync(puzzleId, { $set: { tags: newTagIds } });
    // make sure the update has propagated to oplog watchers, then give Meteor
    // an additional tick to process it
    await updatePropagated;
    await new Promise<void>((r) => { Meteor.defer(r); });

    assert.sameMembers([...sub.data.keys()], [Puzzles._name, Tags._name]);

    const puzzleCollection = sub.data.get(Puzzles._name)!;
    assert.sameMembers([...puzzleCollection.keys()], [puzzleId]);

    const tagCollection = sub.data.get(Tags._name)!;
    assert.sameMembers([...tagCollection.keys()], newTagIds);
  });
});
