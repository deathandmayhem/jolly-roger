import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import Logger from "../../Logger";
import configureCollectGoogleAccountIds from "../../methods/configureCollectGoogleAccountIds";
import GoogleClient from "../googleClientRefresher";
import defineMethod from "./defineMethod";

defineMethod(configureCollectGoogleAccountIds, {
  async run() {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const { people } = GoogleClient;
    if (!people) {
      throw new Meteor.Error(500, "Google integration is disabled");
    }

    let pageToken: string | undefined;
    do {
      const resp = await people.otherContacts.list({
        pageToken,
        sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
        readMask: "emailAddresses,metadata",
      });
      pageToken = resp.data.nextPageToken ?? undefined;

      for (const contact of resp.data.otherContacts ?? []) {
        const id =
          contact.metadata?.sources?.find((s) => s.type === "PROFILE")?.id ??
          undefined;
        if (!id) {
          continue;
        }

        const addresses = contact.emailAddresses?.reduce<string[]>((a, e) => {
          if (e.value) {
            a.push(e.value);
          }
          return a;
        }, []);

        Logger.info("Storing Google account IDs on users", { id, addresses });
        await MeteorUsers.updateAsync(
          {
            googleAccountId: undefined,
            googleAccount: { $in: addresses },
          },
          {
            $set: {
              googleAccountId: id,
            },
          },
          { multi: true },
        );
      }
    } while (pageToken);
  },
});
