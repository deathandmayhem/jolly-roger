import type { EJSONable, EJSONableProperty } from "meteor/ejson";
import type { Mongo } from "meteor/mongo";

// Inside namespace Meteor, Error refers to Meteor.Error
type GlobalError = Error;

declare module "meteor/meteor" {
  namespace Meteor {
    // Redeclared as deprecated so that typescript/no-deprecated flags them
    // outside of client code (see the client override in .oxlintrc.json)
    /** @deprecated Use userAsync on the server */
    function user(options?: {
      fields?: Mongo.FieldSpecifier | undefined;
    }): User | null;

    /* oxlint-disable typescript/no-unnecessary-type-parameters -- matches Meteor's own declaration */
    /** @deprecated Use callAsync on the server */
    function call<
      Result extends
        | EJSONable
        | EJSONable[]
        | EJSONableProperty
        | EJSONableProperty[],
    >(name: string, ...args: any[]): Result;
    /* oxlint-enable typescript/no-unnecessary-type-parameters */

    /** @deprecated Use applyAsync on the server */
    function apply<
      Result extends
        | EJSONable
        | EJSONable[]
        | EJSONableProperty
        | EJSONableProperty[],
    >(
      name: string,
      args: readonly (EJSONable | EJSONableProperty)[],
      options?: MethodApplyOptions<Result>,
      asyncCallback?: (
        error: GlobalError | Meteor.Error | undefined,
        result?: Result,
      ) => void,
    ): Result;
  }
}
