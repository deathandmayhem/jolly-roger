import { check, Match } from "meteor/check";
import type { Subscription } from "meteor/meteor";
import { Meteor } from "meteor/meteor";
import type { Mongo } from "meteor/mongo";
import Bugsnag from "@bugsnag/js";
import type z from "zod";
import { ZodError } from "zod";
import Logger from "../../Logger";
import type TypedPublication from "../../lib/publications/TypedPublication";
import type { PublicationName } from "../../lib/publications/TypedPublication";
import assertStrictSchema from "../assertStrictSchema";

type TypedPublicationReturn =
  | undefined
  | Mongo.Cursor<any>
  | Mongo.Cursor<any>[]
  | Promise<undefined | Mongo.Cursor<any> | Mongo.Cursor<any>[]>;

export default function definePublication<
  Args extends z.ZodTuple,
  Name extends PublicationName<Args>,
>(
  publication: TypedPublication<Args, Name>,
  {
    run,
  }: {
    run: (
      this: Subscription,
      ...args: z.output<Args>
    ) => TypedPublicationReturn | Promise<TypedPublicationReturn>;
  },
): void {
  assertStrictSchema(
    publication.args,
    publication.name === null
      ? "Default publication"
      : `Publication ${publication.name}`,
  );

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
