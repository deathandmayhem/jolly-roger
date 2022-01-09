import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
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
  isSelf: boolean;
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  viewerIsOperator: boolean;
  targetIsOperator: boolean;
}

const ProfilePage = ({ userId, isSelf }: { userId: string, isSelf: boolean }) => {
  useBreadcrumb({ title: 'Users', path: '/users' });

  const profileLoading = useSubscribe('mongo.profiles', { _id: userId });
  const userRolesLoading = useSubscribe('userRoles', userId);
  const loading = profileLoading() || userRolesLoading();

  const tracker = useTracker<ProfilePageTracker>(() => {
    const user = Meteor.user()!;
    const defaultEmail = user.emails![0].address!;
    const data = {
      isSelf: (Meteor.userId() === userId),
      profile: Profiles.findOne(userId) || {
        _id: userId,
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
      targetIsOperator: deprecatedUserMayMakeOperator(userId),
    };
    return data;
  }, [userId]);

  useBreadcrumb({
    title: loading ? 'loading...' : tracker.profile.displayName,
    path: `/users/${userId}`,
  });

  if (loading) {
    return <div>loading...</div>;
  } else if (isSelf) {
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

const ProfileRedirect = () => {
  const userId = useParams<'userId'>().userId!;
  const self = useTracker(() => Meteor.userId()!, []);

  if (userId === 'me') {
    return <Navigate to={`/users/${self}`} replace />;
  }

  return <ProfilePage userId={userId} isSelf={userId === self} />;
};

export default ProfileRedirect;
