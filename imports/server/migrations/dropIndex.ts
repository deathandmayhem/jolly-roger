import { Mongo } from 'meteor/mongo';
import { Promise as MeteorPromise } from 'meteor/promise';

interface Document {
  [key: string]: any;
}

function dropIndex<T extends Document>(
  model: Mongo.Collection<T>,
  index: string
): void {
  // _dropIndex is not idempotent, so we need to figure out if the
  // index already exists
  MeteorPromise.await((async () => {
    const collection = model.rawCollection();
    if (await collection.indexExists(index)) {
      model._dropIndex(index);
    }
  })());
}

export default dropIndex;
