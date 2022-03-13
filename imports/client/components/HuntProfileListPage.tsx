import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { useParams } from 'react-router-dom';
import MeteorUsers from '../../lib/models/MeteorUsers';
import {
  listAllRolesForHunt, userMayAddUsersToHunt, userMayMakeOperatorForHunt, userMayUseDiscordBotAPIs,
} from '../../lib/permission_stubs';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';

const HuntProfileListPage = () => {
  const huntId = useParams<'huntId'>().huntId!;
  useBreadcrumb({ title: 'Hunters', path: `/hunts/${huntId}/hunters` });

  const profilesLoading = useSubscribe('huntProfiles', huntId);
  const userRolesLoading = useSubscribe('huntRoles', huntId);
  const loading = profilesLoading() || userRolesLoading();

  const users = useTracker(() => (
    loading ?
      [] :
      MeteorUsers.find(
        { hunts: huntId, displayName: { $ne: undefined } },
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
    <ProfileList
      users={users}
      roles={roles}
      huntId={huntId}
      canInvite={canInvite}
      canSyncDiscord={canSyncDiscord}
      canMakeOperator={canMakeOperator}
    />
  );
};

export default HuntProfileListPage;
