import type { Meteor } from "meteor/meteor";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faSkullCrossbones } from "@fortawesome/free-solid-svg-icons/faSkullCrossbones";
import Hunts from "./models/Hunts";
import MeteorUsers from "./models/MeteorUsers";
import { userIsOperatorForHunt } from "./permission_stubs";

export type SpecialUser = {
  _id: string;
  displayName: string;
  icon: IconDefinition;
};

const OPERATOR_ID = "operatorFakeid234";

const specialUsersArray: SpecialUser[] = [
  { _id: OPERATOR_ID, displayName: "Operators", icon: faSkullCrossbones },
];

// Create a Map from _id → SpecialUser
export const specialUsers: Map<string, SpecialUser> = new Map(
  specialUsersArray.map((u) => [u._id, u]),
);

export async function resolveSpecialUser(
  huntId: string,
  sid: string,
): Promise<Meteor.User[]> {
  if (sid === OPERATOR_ID) {
    const users = await MeteorUsers.find({ hunts: huntId }).fetchAsync();
    const hunt = await Hunts.findOneAsync({
      _id: huntId,
    });

    return users.filter((user) => userIsOperatorForHunt(user, hunt));
  }
  return [];
}
