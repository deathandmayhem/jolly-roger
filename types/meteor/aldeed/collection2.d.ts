import SimpleSchema from 'simpl-schema';

declare module 'meteor/mongo' {
  module Mongo {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Collection<T> {
      attachSchema(schema: SimpleSchema): void;
    }
  }
}

declare module 'simpl-schema' {
  interface AutoValueContext {
    isInsert: boolean;
    isUpdate: boolean;
    isUpsert: boolean;
    userId: string;
    isFromTrustedCode: boolean;
    docId?: string;
  }
}
