import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

declare module 'meteor/mongo' {
  module Mongo {
    interface Collection<T> {
      attachRoles(rolesPrefix: string): void;
      attachSchema(schema: SimpleSchema): void;
    }
  }
}
