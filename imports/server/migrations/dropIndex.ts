import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

function dropIndex<T>(
  model: Mongo.Collection<T>,
  index: string
): void {
  // _dropIndex is not idempotent, so we need to figure out if the
  // index already exists
  const collection = model.rawCollection();
  const indexExists = Meteor.wrapAsync(collection.indexExists, collection);
  if (indexExists(index)) {
    model._dropIndex(index);
  }
}

export default dropIndex;
