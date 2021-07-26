import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profiles';
import { withBreadcrumb } from '../hooks/breadcrumb';
import OthersProfilePage from './OthersProfilePage';
import OwnProfilePage from './OwnProfilePage';

interface ProfilePageParams {
  userId: string;
}

interface ProfilePageWithRouterParams extends RouteComponentProps<ProfilePageParams> {
}

interface ProfilePageProps extends ProfilePageWithRouterParams {
  ready: boolean;
  isSelf: boolean;
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  viewerIsOperator: boolean;
  targetIsOperator: boolean;
}

class ProfilePage extends React.Component<ProfilePageProps> {
  render() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    } else if (this.props.isSelf) {
      return (
        <OwnProfilePage
          initialProfile={this.props.profile}
          canMakeOperator={this.props.viewerCanMakeOperator}
          operating={this.props.viewerIsOperator}
        />
      );
    }

    return (
      <OthersProfilePage
        profile={this.props.profile}
        viewerCanMakeOperator={this.props.viewerCanMakeOperator}
        targetIsOperator={this.props.targetIsOperator}
      />
    );
  }
}

const usersCrumb = withBreadcrumb<ProfilePageWithRouterParams>({ title: 'Users', path: '/users' });
const userCrumb = withBreadcrumb(({ match, ready, profile }: ProfilePageProps) => {
  return {
    title: ready ? profile.displayName : 'loading...',
    path: `/users/${match.params.userId}`,
  };
});
const tracker = withTracker(({ match }: ProfilePageWithRouterParams) => {
  const uid = match.params.userId === 'me' ? Meteor.userId()! : match.params.userId;

  const profileHandle = Meteor.subscribe('mongo.profiles', { _id: uid });
  const userRolesHandle = Meteor.subscribe('userRoles', uid);
  const user = Meteor.user()!;
  const defaultEmail = user.emails![0].address!;
  const data = {
    ready: !!user && profileHandle.ready() && userRolesHandle.ready(),
    isSelf: (Meteor.userId() === uid),
    profile: Profiles.findOne(uid) || {
      _id: uid,
      displayName: '',
      primaryEmail: defaultEmail,
      phoneNumber: '',
      dingwords: [],
      deleted: false,
      createdAt: new Date(),
      createdBy: user._id,
      updatedAt: undefined,
      updatedBy: undefined,
      googleAccount: undefined,
      discordAccount: undefined,
      muteApplause: undefined,
    },
    viewerCanMakeOperator: Roles.userHasPermission(Meteor.userId(), 'users.makeOperator'),
    viewerIsOperator: Roles.userHasRole(Meteor.userId()!, 'operator'),
    targetIsOperator: Roles.userHasPermission(uid, 'users.makeOperator'),
  };
  return data;
});

const ProfilePageContainer = usersCrumb(tracker(userCrumb(ProfilePage)));

export default ProfilePageContainer;
