import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profiles';
import ProfileList from './ProfileList';

interface AllProfileListPageTracker {
  ready: boolean;
  profiles: ProfileType[];
}

const AllProfileListPage = () => {
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

const crumb = withBreadcrumb<{}>({ title: 'Users', path: '/users' });

export default crumb(AllProfileListPage);
