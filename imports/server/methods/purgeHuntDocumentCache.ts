import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import purgeHuntDocumentCache from "../../methods/purgeHuntDocumentCache";
import { deleteDocument } from "../gdrive";
import CachedDocuments from "../lib/models/CachedDocuments";
import defineMethod from "./defineMethod";

defineMethod(purgeHuntDocumentCache, {
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  async run({ huntId }) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const hunt = huntId;
    const cachedDocuments = await CachedDocuments.find({ hunt });
    cachedDocuments.forEach((cachedDocument) => {
      if (
        cachedDocument.provider === "google" &&
        cachedDocument.status === "available"
      ) {
        deleteDocument(cachedDocument.value.id);
      }
    });
    await CachedDocuments.removeAsync({ hunt });
  },
});
