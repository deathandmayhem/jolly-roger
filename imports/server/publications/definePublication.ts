import { check, Match } from "meteor/check";
import type { Subscription } from "meteor/meteor";
import { Meteor } from "meteor/meteor";
import type { Mongo } from "meteor/mongo";
import Bugsnag from "@bugsnag/js";
import type z from "zod";
import { ZodError } from "zod";
import Logger from "../../Logger";
import type TypedPublication from "../../lib/publications/TypedPublication";
import type { DefaultTypedPublication } from "../../lib/publications/TypedPublication";

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
export default function definePublication<Args extends z.AnyZodTuple>(
  publication: TypedPublication<Args>,
  config: {
    run: (
      this: Subscription,
      ...args: z.output<Args>
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
  Meteor.publish(publication.name, async function (...args: unknown[]) {
    // Silence audit-argument-checks; we'll do our own validation below.
    check(args, [Match.Any]);

    try {
      const validatedArgs = await publication.args
        .parseAsync(args)
        .catch((error: unknown) => {
          // Attach a sanitized error to get serialized over DDP, but keep the
          // original error for server-side reporting.
          if (error instanceof ZodError) {
            (
              error as ZodError & { sanitizedError?: Meteor.Error }
            ).sanitizedError = new Meteor.Error(
              400,
              `Invalid arguments to publication ${publication.name}`,
            );
          }
          throw error;
        });
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
