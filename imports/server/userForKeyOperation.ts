import { Meteor } from "meteor/meteor";

import isAdmin from "../lib/isAdmin";
import MeteorUsers from "../lib/models/MeteorUsers";

export default async function userForKeyOperation(
  currentUser: string,
  forUser?: string,
) {
  const canOverrideUser = isAdmin(await MeteorUsers.findOneAsync(currentUser));

  if (forUser && !canOverrideUser) {
    throw new Meteor.Error(
      403,
      "Only server admins can fetch other users' keys",
    );
  }

  return forUser ?? currentUser;
}
