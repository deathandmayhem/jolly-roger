import { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { Random } from "meteor/random";
import { assert } from "chai";
import { z } from "zod";
import retrieveOAuthCredential from "../../../../imports/server/retrieveOAuthCredential";

const Identity = z.object({ id: z.string() });

async function storeCredential(credential: unknown) {
  const key = Random.id();
  const secret = Random.id();
  await OAuth._storePendingCredential(key, credential, secret);
  return { key, secret };
}

describe("retrieveOAuthCredential", function () {
  it("returns parsed service data", async function () {
    const { key, secret } = await storeCredential({
      serviceName: "google",
      serviceData: { id: "1234", extra: "dropped" },
    });
    const result = await retrieveOAuthCredential(
      "google",
      key,
      secret,
      Identity,
    );
    assert.deepEqual(result, { id: "1234" });
  });

  it("returns undefined once the credential is consumed", async function () {
    const { key, secret } = await storeCredential({
      serviceName: "google",
      serviceData: { id: "1234" },
    });
    await retrieveOAuthCredential("google", key, secret, Identity);
    const result = await retrieveOAuthCredential(
      "google",
      key,
      secret,
      Identity,
    );
    assert.isUndefined(result);
  });

  it("rejects a credential from another service", async function () {
    const { key, secret } = await storeCredential({
      serviceName: "discord",
      serviceData: { id: "1234" },
    });
    await assert.isRejected(
      retrieveOAuthCredential("google", key, secret, Identity),
      /not for google/,
    );
  });

  it("rejects malformed service data", async function () {
    const { key, secret } = await storeCredential({
      serviceName: "google",
      serviceData: { email: "a@example.com" },
    });
    await assert.isRejected(
      retrieveOAuthCredential("google", key, secret, Identity),
      /Sign-in with google failed/,
    );
  });

  it("rethrows a stored Meteor.Error", async function () {
    const { key, secret } = await storeCredential(
      new Meteor.Error(403, "nope"),
    );
    await assert.isRejected(
      retrieveOAuthCredential("google", key, secret, Identity),
      /nope/,
    );
  });

  it("wraps a stored plain Error", async function () {
    const { key, secret } = await storeCredential(new Error("token exchange"));
    await assert.isRejected(
      retrieveOAuthCredential("google", key, secret, Identity),
      /Sign-in with google failed/,
    );
  });
});
