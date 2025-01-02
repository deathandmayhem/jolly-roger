import { Random } from "meteor/random";
import Logger from "../Logger";
import APIKeys from "../lib/models/APIKeys";
import userForKeyOperation from "./userForKeyOperation";
import withLock from "./withLock";

export default async function ensureAPIKey({
  requestedBy,
  forUser,
}: {
  requestedBy: string;
  forUser?: string;
}) {
  const user = await userForKeyOperation(requestedBy, forUser);

  let key = await APIKeys.findOneAsync({ user });
  if (!key) {
    // It would be cool to handle this with unique indexes, but we
    // need partial indexes to only match { deleted: false }, and I
    // don't want to assume a new enough version of MongoDB for
    // that.
    await withLock(`api_key:${user}`, async () => {
      key = await APIKeys.findOneAsync({ user });

      if (!key) {
        Logger.info("Generating new API key for user", { user, requestedBy });
        key = await APIKeys.findOneAsync(
          await APIKeys.insertAsync({
            user,
            key: Random.id(32),
          }),
        );
      }
    });
  }

  return key!.key;
}
