import { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import type { z } from "zod";
import Logger from "../Logger";

// Resolves to undefined if there is no pending credential for this key/secret,
// e.g. because a retried method call already consumed it.
export default async function retrieveOAuthCredential<S extends z.ZodType>(
  service: string,
  key: string,
  secret: string,
  serviceDataSchema: S,
): Promise<z.output<S> | undefined> {
  const credential = await OAuth.retrieveCredential(key, secret);
  if (credential === undefined) {
    return undefined;
  }

  // The OAuth flow itself failed, and the OAuth package stored the error
  if (credential instanceof Error) {
    if (credential instanceof Meteor.Error) {
      throw credential;
    }
    Logger.error("OAuth flow failed", { service, error: credential });
    throw new Meteor.Error(500, `Sign-in with ${service} failed`);
  }

  // Credentials from any service share one store, so a credential from one
  // service must not be accepted as proof of an identity on another
  if (credential.serviceName !== service) {
    throw new Meteor.Error(400, `Credential is not for ${service}`);
  }

  const result = serviceDataSchema.safeParse(credential.serviceData);
  if (!result.success) {
    Logger.error("Unexpected OAuth service data", {
      service,
      error: result.error,
    });
    throw new Meteor.Error(500, `Sign-in with ${service} failed`);
  }
  return result.data;
}
