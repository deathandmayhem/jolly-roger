/* @ts-expect-error I don't understand why, but this fixes the weird
   MongoInternals export in @types/mongo */
import { MongoInternals } from 'meteor/mongo';

declare module 'meteor/mongo' {
  namespace Mongo {
    interface Collection<T> {
      // We can get this property from tableName on our models, but we need this
      // for models that don't descend from Base, like Meteor.users
      _name: string;
    }
  }
}
