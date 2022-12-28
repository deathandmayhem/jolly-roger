import 'meteor/mongo';

declare module 'meteor/mongo' {
  namespace Mongo {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Cursor<T, U> {
      [Symbol.iterator](): Iterator<T>;
      [Symbol.asyncIterator](): AsyncIterator<T>;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Collection<T> {
      dropIndexAsync(indexName: string): Promise<void>;
    }
  }
}
