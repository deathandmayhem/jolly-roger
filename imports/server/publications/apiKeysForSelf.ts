import APIKeys from "../../lib/models/APIKeys";
import apiKeysForSelf from "../../lib/publications/apiKeysForSelf";
import definePublication from "./definePublication";

definePublication(apiKeysForSelf, {
  run() {
    if (!this.userId) {
      return [];
    }

    return APIKeys.find({ user: this.userId });
  },
});
