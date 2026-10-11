/* @ts-expect-error I don't understand why, but this fixes the weird
   MongoInternals export in @types/mongo */
import { MongoInternals } from "meteor/mongo";

declare module "meteor/mongo" {
  namespace Mongo {
    interface Collection<T> {
      _makeNewID(): T extends { _id: infer ID } ? ID : string;
      // We can get this property from tableName on our models, but we need this
      // for models that don't descend from Base, like Meteor.users
      _name: string;
    }

    // Redeclared as deprecated so that typescript/no-deprecated flags them
    // outside of client code (see the client override in .oxlintrc.json)
    interface Collection<T> {
      /** @deprecated Use createCappedCollectionAsync on the server */
      _createCappedCollection(byteSize?: number, maxDocuments?: number): void;
    }

    interface Cursor<T, U = T> {
      /** @deprecated Use countAsync on the server */
      count(applySkipLimit?: boolean): number;
      /** @deprecated Use fetchAsync on the server */
      fetch(): U[];
      /** @deprecated Use forEachAsync on the server */
      forEach(
        callback: (doc: U, index: number, cursor: Cursor<T, U>) => void,
        thisArg?: any,
      ): void;
      /** @deprecated Use mapAsync on the server */
      map<M>(
        callback: (doc: U, index: number, cursor: Cursor<T, U>) => M,
        thisArg?: any,
      ): M[];
    }
  }
}
