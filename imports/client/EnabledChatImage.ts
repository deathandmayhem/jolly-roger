import { Mongo } from "meteor/mongo";

interface EnabledChatImageType {
  enabled: boolean;
}

// Pseudo-collection used to track
const EnabledChatImage = new Mongo.Collection<EnabledChatImageType>(
  "enabledChatImage",
);

export default EnabledChatImage;
