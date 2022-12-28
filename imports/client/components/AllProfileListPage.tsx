import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';

const AllProfileListPage = () => {
  useBreadcrumb({ title: 'Users', path: '/users' });
  const profilesLoading = useSubscribe('allProfiles');
  const loading = profilesLoading();

  const users = useTracker(() => {
    return loading ?
      [] :
      MeteorUsers.find({ displayName: { $ne: undefined } }, { sort: { displayName: 1 } }).fetch();
  }, [loading]);

  if (loading) {
    return <div>loading...</div>;
  }
  return <ProfileList users={users} />;
};

export default AllProfileListPage;
