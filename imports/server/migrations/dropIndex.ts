import { Mongo } from 'meteor/mongo';

interface Document {
  [key: string]: any;
}

async function dropIndex<T extends Document>(
  model: Mongo.Collection<T>,
  index: string
) {
  // _dropIndex is not idempotent, so we need to figure out if the
  // index already exists
  const collection = model.rawCollection();
  if (await collection.indexExists(index)) {
    await model.dropIndexAsync(index);
  }
}

export default dropIndex;
