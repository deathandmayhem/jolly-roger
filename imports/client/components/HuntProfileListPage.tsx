import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import {
  Route, Routes, useParams,
} from 'react-router-dom';
import MeteorUsers from '../../lib/models/meteor_users';
import Profiles from '../../lib/models/profiles';
import { userMayAddUsersToHunt, userMayUseDiscordBotAPIs } from '../../lib/permission_stubs';
import { ProfileType } from '../../lib/schemas/profile';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';
import UserInvitePage from './UserInvitePage';

interface HuntProfileListPageTracker {
  canInvite: boolean;
  canSyncDiscord: boolean;
  profiles: ProfileType[];
}

const HuntProfileListPage = () => {
  const huntId = useParams<'huntId'>().huntId!;
  useBreadcrumb({ title: 'Hunters', path: `/hunts/${huntId}/hunters` });

  const usersLoading = useSubscribe('huntMembers', huntId);
  const profilesLoading = useSubscribe('mongo.profiles');
  const loading = usersLoading() || profilesLoading();

  const tracker = useTracker<HuntProfileListPageTracker>(() => {
    if (loading) {
      return {
        canInvite: false,
        canSyncDiscord: false,
        profiles: [],
      };
    }

    const canInvite = userMayAddUsersToHunt(Meteor.userId(), huntId);
    const hunters = MeteorUsers.find({ hunts: huntId }).map((u) => u._id) as string[];
    const profiles = Profiles.find(
      { _id: { $in: hunters } },
      { sort: { displayName: 1 } },
    ).fetch();

    const canSyncDiscord = userMayUseDiscordBotAPIs(Meteor.userId());

    return {
      canInvite,
      canSyncDiscord,
      profiles,
    };
  }, [loading, huntId]);
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
            profiles={tracker.profiles}
            huntId={huntId}
            canInvite={tracker.canInvite}
            canSyncDiscord={tracker.canSyncDiscord}
          />
        )}
      />
    </Routes>
  );
};

export default HuntProfileListPage;
