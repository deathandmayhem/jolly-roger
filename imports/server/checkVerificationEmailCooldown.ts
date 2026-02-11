import { Meteor } from "meteor/meteor";
import MeteorUsers from "../lib/models/MeteorUsers";

const COOLDOWN_MS = 60_000;

export default async function checkVerificationEmailCooldown(
  userId: string,
): Promise<void> {
  const user = await MeteorUsers.findOneAsync(userId, {
    fields: { "services.email.verificationTokens": 1 },
  });

  const tokens = user?.services?.email?.verificationTokens;
  if (!tokens || tokens.length === 0) {
    return;
  }

  let mostRecent = 0;
  for (const token of tokens) {
    const when = token.when.getTime();
    if (when > mostRecent) {
      mostRecent = when;
    }
  }

  if (Date.now() - mostRecent < COOLDOWN_MS) {
    throw new Meteor.Error(
      429,
      "Please wait before requesting another verification email",
    );
  }
}
