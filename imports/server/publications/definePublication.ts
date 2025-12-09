import type { Subscription } from "meteor/meteor";
import { Meteor } from "meteor/meteor";
import type { Mongo } from "meteor/mongo";
import Bugsnag from "@bugsnag/js";
import Logger from "../../Logger";
import type TypedPublication from "../../lib/publications/TypedPublication";
import type {
  DefaultTypedPublication,
  TypedPublicationArgs,
} from "../../lib/publications/TypedPublication";

type TypedPublicationReturn =
  | undefined
  | Mongo.Cursor<any>
  | Mongo.Cursor<any>[]
  | Promise<undefined | Mongo.Cursor<any> | Mongo.Cursor<any>[]>;
type TypedPublicationValidator<Arg extends TypedPublicationArgs> = (
  arg0: unknown,
) => Arg;
type TypedPublicationRun<Arg extends TypedPublicationArgs> = Arg extends void
  ? (this: Subscription) => TypedPublicationReturn
  : (this: Subscription, arg0: Arg) => TypedPublicationReturn;

const voidValidator = () => {
  /* noop */
};

// Supporting publications with void arguments is a bit messy, but as with
// TypedMethods, worth doing. See TypedMethod for an explanation of the
// shenanigans required, which are basically the same here
export default function definePublication<
  Publication extends TypedPublication<any> | DefaultTypedPublication,
  Args extends TypedPublicationArgs = Publication extends TypedPublication<
    infer A
  >
    ? A
    : void,
>(
  publication: Publication,
  {
    validate,
    run,
  }: {
    run: TypedPublicationRun<Args>;
  } & (Args extends void
    ? { validate?: undefined }
    : { validate: TypedPublicationValidator<Args> }),
) {
  const validator = (validate ??
    voidValidator) as TypedPublicationValidator<Args>;

  Meteor.publish(publication.name, async function (arg0: Args) {
    try {
      const validatedArg0 = validator.bind(this)(arg0) as any;
      return await run.bind(this)(validatedArg0);
    } catch (error) {
      Logger.info("Error in publication", {
        name: publication.name,
        user: this.userId,
        arguments: arg0,
        error: error instanceof Error ? error.message : error,
      });
      if (error instanceof Error && Bugsnag.isStarted()) {
        Bugsnag.notify(error, (event) => {
          event.context = publication.name ?? "default publication";
        });
      }
      throw error;
    }
  });
}
