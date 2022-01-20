import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import {
  Route, Routes, useParams,
} from 'react-router-dom';
import MeteorUsers from '../../lib/models/meteor_users';
import Profiles from '../../lib/models/profiles';
import {
  listAllRolesForHunt, userMayAddUsersToHunt, userMayMakeOperatorForHunt, userMayUseDiscordBotAPIs,
} from '../../lib/permission_stubs';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';
import UserInvitePage from './UserInvitePage';

const HuntProfileListPage = () => {
  const huntId = useParams<'huntId'>().huntId!;
  useBreadcrumb({ title: 'Hunters', path: `/hunts/${huntId}/hunters` });

  const usersLoading = useSubscribe('huntMembers', huntId);
  const userRolesLoading = useSubscribe('huntUserInfo', huntId);
  const profilesLoading = useSubscribe('mongo.profiles');
  const loading = usersLoading() || userRolesLoading() || profilesLoading();

  const profiles = useTracker(() => (
    loading ?
      [] :
      Profiles.find(
        { _id: { $in: MeteorUsers.find({ hunts: huntId }).map((u) => u._id) } },
        { sort: { displayName: 1 } },
      ).fetch()
  ), [huntId, loading]);

  const { canInvite, canSyncDiscord, canMakeOperator } = useTracker(() => {
    return {
      canInvite: userMayAddUsersToHunt(Meteor.userId(), huntId),
      canSyncDiscord: userMayUseDiscordBotAPIs(Meteor.userId()),
      canMakeOperator: userMayMakeOperatorForHunt(Meteor.userId(), huntId),
    };
  }, [huntId]);
  const roles = useTracker(() => (
    loading || !canMakeOperator ?
      {} :
      Object.fromEntries(MeteorUsers.find({ hunts: huntId })
        .map((u) => [u._id, listAllRolesForHunt(u._id, huntId)]))
  ), [huntId, loading, canMakeOperator]);

  if (loading) {
    return <div>loading...</div>;
  }

  return (
    <Routes>
      <Route path="invite" element={<UserInvitePage />} />
      <Route
        path=""
        element={(
          <ProfileList
            profiles={profiles}
            roles={roles}
            huntId={huntId}
            canInvite={canInvite}
            canSyncDiscord={canSyncDiscord}
            canMakeOperator={canMakeOperator}
          />
        )}
      />
    </Routes>
  );
};

export default HuntProfileListPage;
