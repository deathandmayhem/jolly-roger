import type { Subscription } from "meteor/meteor";
import { Meteor } from "meteor/meteor";
import type { Mongo } from "meteor/mongo";
import Bugsnag from "@bugsnag/js";
import Logger from "../../Logger";
import type TypedPublication from "../../lib/publications/TypedPublication";
import type { DefaultTypedPublication } from "../../lib/publications/TypedPublication";
import type z from "zod";

type TypedPublicationReturn =
  | undefined
  | Mongo.Cursor<any>
  | Mongo.Cursor<any>[]
  | Promise<undefined | Mongo.Cursor<any> | Mongo.Cursor<any>[]>;

export default function definePublication(
  publication: DefaultTypedPublication,
  config: {
    run: (
      this: Subscription,
    ) => TypedPublicationReturn | Promise<TypedPublicationReturn>;
  },
): void;
export default function definePublication<Args extends z.ZodTuple>(
  publication: TypedPublication<Args>,
  config: {
    run: (
      this: Subscription,
      ...args: z.infer<Args>
    ) => TypedPublicationReturn | Promise<TypedPublicationReturn>;
  },
): void;
export default function definePublication(
  publication: TypedPublication<any> | DefaultTypedPublication,
  {
    run,
  }: {
    run: (
      this: Subscription,
      ...args: any[]
    ) => TypedPublicationReturn | Promise<TypedPublicationReturn>;
  },
) {
  Meteor.publish(publication.name, async function (...args: any[]) {
    try {
      const validatedArgs = await publication.args.parseAsync(args);
      return await run.apply(this, validatedArgs);
    } catch (error) {
      Logger.info("Error in publication", {
        name: publication.name,
        user: this.userId,
        arguments: args,
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
