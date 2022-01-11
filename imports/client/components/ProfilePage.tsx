import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Profiles from '../../lib/models/profiles';
import {
  deprecatedUserMayMakeOperator,
  deprecatedIsActiveOperator,
} from '../../lib/permission_stubs';
import { useBreadcrumb } from '../hooks/breadcrumb';
import OthersProfilePage from './OthersProfilePage';
import OwnProfilePage from './OwnProfilePage';

const ProfilePage = ({ userId, isSelf }: { userId: string, isSelf: boolean }) => {
  useBreadcrumb({ title: 'Users', path: '/users' });

  const profileLoading = useSubscribe('mongo.profiles', { _id: userId });
  const userInfoLoading = useSubscribe('userInfo', userId);
  const loading = profileLoading() || userInfoLoading();

  const profile = useTracker(() => {
    const user = Meteor.user()!;
    const defaultEmail = user.emails![0].address!;
    return Profiles.findOne(userId) || {
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
    };
  }, [userId]);
  const hunts = useTracker(() => Meteor.users.findOne(userId)?.hunts, [userId]);
  const { viewerCanMakeOperator, viewerIsOperator, targetIsOperator } = useTracker(() => {
    return {
      viewerCanMakeOperator: deprecatedUserMayMakeOperator(Meteor.userId()),
      viewerIsOperator: deprecatedIsActiveOperator(Meteor.userId()),
      targetIsOperator: deprecatedUserMayMakeOperator(userId),
    };
  }, [userId]);

  useBreadcrumb({
    title: loading ? 'loading...' : profile.displayName,
    path: `/users/${userId}`,
  });

  if (loading) {
    return <div>loading...</div>;
  } else if (isSelf) {
    return (
      <OwnProfilePage
        initialProfile={profile}
        canMakeOperator={viewerCanMakeOperator}
        operating={viewerIsOperator}
      />
    );
  }

  return (
    <OthersProfilePage
      profile={profile}
      viewerCanMakeOperator={viewerCanMakeOperator}
      targetIsOperator={targetIsOperator}
      huntMembership={hunts}
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
