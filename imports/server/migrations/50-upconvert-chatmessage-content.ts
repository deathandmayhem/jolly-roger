import ChatMessages, {
  contentFromMessage,
} from "../../lib/models/ChatMessages";
import ChatNotifications from "../../lib/models/ChatNotifications";
import FeatureFlags from "../../lib/models/FeatureFlags";
import Migrations from "./Migrations";

Migrations.add({
  version: 50,
  name: "Upconvert ChatMessage text to content",
  async up() {
    // Convert any ChatMessages that have text rather than content
    for await (const m of ChatMessages.find(<any>{ text: { $ne: null } })) {
      const content = contentFromMessage((<any>m).text);
      await ChatMessages.collection.rawCollection().updateOne(
        { _id: m._id },
        {
          $set: { content },
          $unset: { text: 1 },
        },
        {
          bypassDocumentValidation: true,
        },
      );
    }

    // Also convert ChatNotifications, which denorm the message text/content from ChatMessage
    for await (const n of ChatNotifications.find(<any>{
      text: { $ne: null },
    })) {
      const content = contentFromMessage((<any>n).text);
      await ChatNotifications.collection.rawCollection().updateOne(
        { _id: n._id },
        {
          $set: { content },
          $unset: { text: 1 },
        },
        {
          bypassDocumentValidation: true,
        },
      );
    }

    // Remove the feature flag that caused fallback to chat v1
    await FeatureFlags.removeAsync({ name: "disable.chatv2" } as any);
  },
});
