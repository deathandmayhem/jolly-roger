import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profiles';
import ProfileList from './ProfileList';

interface AllProfileListPageProps {
  ready: boolean;
  profiles: ProfileType[];
}

class AllProfileListPage extends React.Component<AllProfileListPageProps> {
  render() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    }
    return <ProfileList profiles={this.props.profiles} />;
  }
}

const crumb = withBreadcrumb<{}>({ title: 'Users', path: '/users' });
const tracker = withTracker(() => {
  const profilesHandle = Meteor.subscribe('mongo.profiles');
  const ready = profilesHandle.ready();
  const profiles = ready ? Profiles.find({}, { sort: { displayName: 1 } }).fetch() : [];
  return {
    ready,
    profiles,
  };
});

export default crumb(tracker(AllProfileListPage));
