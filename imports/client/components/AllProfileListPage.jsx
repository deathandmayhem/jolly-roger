import { _ } from 'meteor/underscore';
import React from 'react';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import ProfileList from './ProfileList';
import ProfileSchema from '../../lib/schemas/profiles';
import Profiles from '../../lib/models/profiles';

class AllProfileListPage extends React.Component {
  static propTypes = {
    ready: PropTypes.bool.isRequired,
    profiles: PropTypes.arrayOf(PropTypes.shape(ProfileSchema.asReactPropTypes())).isRequired,
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

export default _.compose(crumb, tracker)(AllProfileListPage);
