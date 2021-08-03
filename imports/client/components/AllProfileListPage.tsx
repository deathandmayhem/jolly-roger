import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profiles';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ProfileList from './ProfileList';

interface AllProfileListPageTracker {
  ready: boolean;
  profiles: ProfileType[];
}

const AllProfileListPage = () => {
  useBreadcrumb({ title: 'Users', path: '/users' });

  const tracker: AllProfileListPageTracker = useTracker(() => {
    const profilesHandle = Meteor.subscribe('mongo.profiles');
    const ready = profilesHandle.ready();
    const profiles = ready ? Profiles.find({}, { sort: { displayName: 1 } }).fetch() : [];
    return {
      ready,
      profiles,
    };
  }, []);

  if (!tracker.ready) {
    return <div>loading...</div>;
  }
  return <ProfileList profiles={tracker.profiles} />;
};

export default AllProfileListPage;
