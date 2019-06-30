import * as React from 'react';
import * as PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import ProfileList from './ProfileList';
import ProfileSchema, { ProfileType } from '../../lib/schemas/profiles';
import Profiles from '../../lib/models/profiles';

interface AllProfileListPageProps {
  ready: boolean;
  profiles: ProfileType[];
}

class AllProfileListPage extends React.Component<AllProfileListPageProps> {
  static propTypes = {
    ready: PropTypes.bool.isRequired,
    profiles: PropTypes.arrayOf(
      PropTypes.shape(
        ProfileSchema.asReactPropTypes<ProfileType>()
      ).isRequired as React.Validator<ProfileType>
    ).isRequired,
  };

  render() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    }
    return <ProfileList profiles={this.props.profiles} />;
  }
}

const crumb = withBreadcrumb({ title: 'Users', path: '/users' });
const tracker = withTracker(() => {
  const profilesHandle = subsCache.subscribe('mongo.profiles');
  const ready = profilesHandle.ready();
  const profiles = ready ? Profiles.find({}, { sort: { displayName: 1 } }).fetch() : [];
  return {
    ready,
    profiles,
  };
});

export default crumb(tracker(AllProfileListPage));
