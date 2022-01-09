import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profile';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';

interface AllProfileListPageTracker {
  profiles: ProfileType[];
}

const AllProfileListPage = () => {
  useBreadcrumb({ title: 'Users', path: '/users' });
  const profilesLoading = useSubscribe('mongo.profiles');
  const loading = profilesLoading();

  const tracker: AllProfileListPageTracker = useTracker(() => {
    const profiles = loading ? [] : Profiles.find({}, { sort: { displayName: 1 } }).fetch();
    return {
      profiles,
    };
  }, [loading]);

  if (loading) {
    return <div>loading...</div>;
  }
  return <ProfileList profiles={tracker.profiles} />;
};

export default AllProfileListPage;
