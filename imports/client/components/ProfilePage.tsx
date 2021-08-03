import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profiles';
import { useBreadcrumb } from '../hooks/breadcrumb';
import OthersProfilePage from './OthersProfilePage';
import OwnProfilePage from './OwnProfilePage';

interface ProfilePageParams {
  userId: string;
}

interface ProfilePageTracker {
  ready: boolean;
  isSelf: boolean;
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  viewerIsOperator: boolean;
  targetIsOperator: boolean;
}

const ProfilePage = (props: RouteComponentProps<ProfilePageParams>) => {
  useBreadcrumb({ title: 'Users', path: '/users' });

  const { userId } = props.match.params;
  const tracker = useTracker<ProfilePageTracker>(() => {
    const uid = userId === 'me' ? Meteor.userId()! : userId;

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
  }, [userId]);

  useBreadcrumb({
    title: tracker.ready ? tracker.profile.displayName : 'loading...',
    path: `/users/${userId}`,
  });

  if (!tracker.ready) {
    return <div>loading...</div>;
  } else if (tracker.isSelf) {
    return (
      <OwnProfilePage
        initialProfile={tracker.profile}
        canMakeOperator={tracker.viewerCanMakeOperator}
        operating={tracker.viewerIsOperator}
      />
    );
  }

  return (
    <OthersProfilePage
      profile={tracker.profile}
      viewerCanMakeOperator={tracker.viewerCanMakeOperator}
      targetIsOperator={tracker.targetIsOperator}
    />
  );
};

export default ProfilePage;
