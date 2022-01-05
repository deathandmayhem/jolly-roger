import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import {
  Route, Switch, useParams, useRouteMatch,
} from 'react-router';
import MeteorUsers from '../../lib/models/meteor_users';
import Profiles from '../../lib/models/profiles';
import { userMayAddUsersToHunt, userMayUseDiscordBotAPIs } from '../../lib/permission_stubs';
import { ProfileType } from '../../lib/schemas/profile';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';
import UserInvitePage from './UserInvitePage';

interface HuntProfileListPageParams {
  huntId: string;
}

interface HuntProfileListPageTracker {
  ready: boolean;
  canInvite: boolean;
  canSyncDiscord: boolean;
  profiles: ProfileType[];
}

const HuntProfileListPage = () => {
  const { huntId } = useParams<HuntProfileListPageParams>();
  const { path } = useRouteMatch();
  useBreadcrumb({ title: 'Hunters', path: `/hunts/${huntId}/hunters` });
  const tracker = useTracker<HuntProfileListPageTracker>(() => {
    const usersHandle = Meteor.subscribe('huntMembers', huntId);
    const profilesHandle = Meteor.subscribe('mongo.profiles');

    const ready = usersHandle.ready() && profilesHandle.ready();
    if (!ready) {
      return {
        ready: false,
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
      ready: ready as boolean,
      canInvite,
      canSyncDiscord,
      profiles,
    };
  }, [huntId]);
  if (!tracker.ready) {
    return <div>loading...</div>;
  }

  return (
    <Switch>
      <Route path={`${path}/invite`} render={() => <UserInvitePage />} />
      <Route
        path={`${path}`}
        render={() => (
          <ProfileList
            profiles={tracker.profiles}
            huntId={huntId}
            canInvite={tracker.canInvite}
            canSyncDiscord={tracker.canSyncDiscord}
          />
        )}
      />
    </Switch>
  );
};

export default HuntProfileListPage;
