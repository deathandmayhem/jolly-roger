import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Profiles from '../../lib/models/profiles';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';

const AllProfileListPage = () => {
  useBreadcrumb({ title: 'Users', path: '/users' });
  const profilesLoading = useSubscribe('mongo.profiles');
  const loading = profilesLoading();

  const profiles = useTracker(() => {
    return loading ? [] : Profiles.find({}, { sort: { displayName: 1 } }).fetch();
  }, [loading]);

  if (loading) {
    return <div>loading...</div>;
  }
  return <ProfileList profiles={profiles} />;
};

export default AllProfileListPage;
