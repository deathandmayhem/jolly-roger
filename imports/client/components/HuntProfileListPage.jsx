import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from 'meteor/nicolaslopezj:roles';
import PropTypes from 'prop-types';
import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import ProfileList from './ProfileList';
import ProfilesSchema from '../../lib/schemas/profiles';
import Profiles from '../../lib/models/profiles';

class HuntProfileListPage extends React.Component {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    canInvite: PropTypes.bool.isRequired,
    profiles: PropTypes.arrayOf(PropTypes.shape(ProfilesSchema.asReactPropTypes())).isRequired,
  };

  render() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    }

    return (
      <ProfileList
        profiles={this.props.profiles}
        huntId={this.props.params.huntId}
        canInvite={this.props.canInvite}
      />
    );
  }
}

const crumb = withBreadcrumb(({ params }) => {
  return { title: 'Hunters', link: `/hunts/${params.huntId}/hunters` };
});
const tracker = withTracker(({ params }) => {
  const usersHandle = subsCache.subscribe('huntMembers', params.huntId);
  const profilesHandle = subsCache.subscribe('mongo.profiles');

  const ready = usersHandle.ready() && profilesHandle.ready();
  if (!ready) {
    return {
      ready: false,
      canInvite: false,
      profiles: [],
    };
  }

  const canInvite = Roles.userHasPermission(
    Meteor.userId(), 'hunt.join', params.huntId
  );

  const hunters = Meteor.users.find({ hunts: params.huntId }).map(u => u._id);
  const profiles = Profiles.find(
    { _id: { $in: hunters } },
    { sort: { displayName: 1 } },
  ).fetch();

  return { ready, canInvite, profiles };
});

const HuntProfileListPageContainer = _.compose(crumb, tracker)(HuntProfileListPage);
HuntProfileListPageContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};

export default HuntProfileListPageContainer;
