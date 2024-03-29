import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import React from "react";
import { useParams } from "react-router-dom";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import {
  listAllRolesForHunt,
  userMayAddUsersToHunt,
  userMayMakeOperatorForHunt,
  userMayUseDiscordBotAPIs,
} from "../../lib/permission_stubs";
import ProfileList from "./ProfileList";

const HuntProfileListPage = () => {
  const huntId = useParams<"huntId">().huntId!;

  const profilesLoading = useSubscribe("huntProfiles", huntId);
  const userRolesLoading = useSubscribe("huntRoles", huntId);
  const loading = profilesLoading() || userRolesLoading();

  const users = useTracker(
    () =>
      loading
        ? []
        : MeteorUsers.find(
            { hunts: huntId, displayName: { $ne: undefined } },
            { sort: { displayName: 1 } },
          ).fetch(),
    [huntId, loading],
  );

  const hunt = useTracker(() => Hunts.findOne(huntId), [huntId]);
  const { canInvite, canSyncDiscord, canMakeOperator } = useTracker(() => {
    return {
      canInvite: userMayAddUsersToHunt(Meteor.user(), hunt),
      canSyncDiscord: userMayUseDiscordBotAPIs(Meteor.user()),
      canMakeOperator: userMayMakeOperatorForHunt(Meteor.user(), hunt),
    };
  }, [hunt]);
  const roles = useTracker(
    () =>
      loading || !canMakeOperator
        ? {}
        : Object.fromEntries(
            MeteorUsers.find({ hunts: huntId }).map((u) => [
              u._id,
              listAllRolesForHunt(u, hunt),
            ]),
          ),
    [huntId, hunt, loading, canMakeOperator],
  );

  if (loading) {
    return <div>loading...</div>;
  }

  return (
    <ProfileList
      users={users}
      roles={roles}
      hunt={hunt}
      canInvite={canInvite}
      canSyncDiscord={canSyncDiscord}
      canMakeOperator={canMakeOperator}
    />
  );
};

export default HuntProfileListPage;
