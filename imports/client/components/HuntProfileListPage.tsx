import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router';
import MeteorUsers from '../../lib/models/meteor_users';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profiles';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';
import UserInvitePage from './UserInvitePage';

interface HuntProfileListPageParams {
  huntId: string;
}

interface HuntProfileListPageWithRouterParams extends
  RouteComponentProps<HuntProfileListPageParams> {
}

interface HuntProfileListPageTracker {
  ready: boolean;
  canInvite: boolean;
  canSyncDiscord: boolean;
  profiles: ProfileType[];
}

const HuntProfileListPage = (props: HuntProfileListPageWithRouterParams) => {
  useBreadcrumb({ title: 'Hunters', path: `/hunts/${props.match.params.huntId}/hunters` });
  const tracker = useTracker<HuntProfileListPageTracker>(() => {
    const huntId = props.match.params.huntId;
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

    const canInvite = Roles.userHasPermission(
      Meteor.userId(), 'hunt.join', huntId
    );

    const hunters = MeteorUsers.find({ hunts: huntId }).map((u) => u._id) as string[];
    const profiles = Profiles.find(
      { _id: { $in: hunters } },
      { sort: { displayName: 1 } },
    ).fetch();

    const canSyncDiscord = Roles.userHasPermission(Meteor.userId(), 'discord.useBotAPIs');

    return {
      ready: ready as boolean,
      canInvite,
      canSyncDiscord,
      profiles,
    };
  }, [props.match.params.huntId]);
  if (!tracker.ready) {
    return <div>loading...</div>;
  }

  const match = props.match;
  return (
    <Switch>
      <Route path={`${match.path}/invite`} component={UserInvitePage} />
      <Route path={`${match.path}`}>
        <ProfileList
          profiles={tracker.profiles}
          huntId={props.match.params.huntId}
          canInvite={tracker.canInvite}
          canSyncDiscord={tracker.canSyncDiscord}
        />
      </Route>
    </Switch>
  );
};

export default HuntProfileListPage;
