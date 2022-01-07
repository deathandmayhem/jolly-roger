import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { useParams } from 'react-router-dom';
import Profiles from '../../lib/models/profiles';
import {
  deprecatedUserMayMakeOperator,
  deprecatedIsActiveOperator,
} from '../../lib/permission_stubs';
import { ProfileType } from '../../lib/schemas/profile';
import { useBreadcrumb } from '../hooks/breadcrumb';
import OthersProfilePage from './OthersProfilePage';
import OwnProfilePage from './OwnProfilePage';

interface ProfilePageTracker {
  ready: boolean;
  isSelf: boolean;
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  viewerIsOperator: boolean;
  targetIsOperator: boolean;
}

const ProfilePage = () => {
  useBreadcrumb({ title: 'Users', path: '/users' });

  const userId = useParams<'userId'>().userId!;
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
      viewerCanMakeOperator: deprecatedUserMayMakeOperator(Meteor.userId()),
      viewerIsOperator: deprecatedIsActiveOperator(Meteor.userId()),
      targetIsOperator: deprecatedUserMayMakeOperator(uid),
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
