import Hunts from "../../lib/models/Hunts";
import huntForHuntApp from "../../lib/publications/huntForHuntApp";
import definePublication from "./definePublication";

definePublication(huntForHuntApp, {
  run({ huntId }) {
    if (!this.userId) {
      return [];
    }

    return Hunts.findAllowingDeleted({ _id: huntId });
  },
});
