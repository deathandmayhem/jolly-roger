import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import React from 'react';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import { RouteComponentProps } from 'react-router';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profiles';
import ProfileList from './ProfileList';

interface HuntProfileListPageParams {
  huntId: string;
}

interface HuntProfileListPageWithRouterParams extends
  RouteComponentProps<HuntProfileListPageParams> {
}

interface HuntProfileListPageProps extends HuntProfileListPageWithRouterParams {
  ready: boolean;
  canInvite: boolean;
  profiles: ProfileType[];
}

class HuntProfileListPage extends React.Component<HuntProfileListPageProps> {
  render() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    }

    return (
      <ProfileList
        profiles={this.props.profiles}
        huntId={this.props.match.params.huntId}
        canInvite={this.props.canInvite}
      />
    );
  }
}

const crumb = withBreadcrumb(({ match }: HuntProfileListPageWithRouterParams) => {
  return { title: 'Hunters', path: `/hunts/${match.params.huntId}/hunters` };
});
const tracker = withTracker(({ match }: HuntProfileListPageWithRouterParams) => {
  const usersHandle = Meteor.subscribe('huntMembers', match.params.huntId);
  const profilesHandle = Meteor.subscribe('mongo.profiles');

  const ready = usersHandle.ready() && profilesHandle.ready();
  if (!ready) {
    return {
      ready: false,
      canInvite: false,
      profiles: [],
    };
  }

  const canInvite = Roles.userHasPermission(
    Meteor.userId(), 'hunt.join', match.params.huntId
  );

  const hunters = Meteor.users.find({ hunts: match.params.huntId }).map((u) => u._id) as string[];
  const profiles = Profiles.find(
    { _id: { $in: hunters } },
    { sort: { displayName: 1 } },
  ).fetch();

  return { ready: ready as boolean, canInvite, profiles };
});

const HuntProfileListPageContainer = crumb(tracker(HuntProfileListPage));

export default HuntProfileListPageContainer;
