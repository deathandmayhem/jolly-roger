import 'meteor/mongo';

declare module 'meteor/mongo' {
  namespace Mongo {
    interface Cursor<T, U> {
      [Symbol.iterator](): Iterator<T>;
      [Symbol.asyncIterator](): AsyncIterator<T>;
    }

    interface Collection<T> {
      dropIndexAsync(indexName: string): Promise<void>;
    }
  }
}
