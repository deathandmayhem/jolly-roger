import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from 'meteor/nicolaslopezj:roles';
import PropTypes from 'prop-types';
import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import ProfileList from './ProfileList';
import ProfilesSchema, { ProfileType } from '../../lib/schemas/profiles';
import Profiles from '../../lib/models/profiles';

interface HuntProfileListPageProps {
  params: {huntId: string};
  ready: boolean;
  canInvite: boolean;
  profiles: ProfileType[];
}

class HuntProfileListPage extends React.Component<HuntProfileListPageProps> {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    canInvite: PropTypes.bool.isRequired,
    profiles: PropTypes.arrayOf(
      PropTypes.shape(
        ProfilesSchema.asReactPropTypes<ProfileType>()
      ).isRequired as React.Validator<ProfileType>
    ).isRequired,
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

const crumb = withBreadcrumb(({ params }: {params: {huntId: string }}) => {
  return { title: 'Hunters', path: `/hunts/${params.huntId}/hunters` };
});
const tracker = withTracker(({ params }: {params: {huntId: string}}) => {
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

  const hunters = Meteor.users.find({ hunts: params.huntId }).map(u => u._id) as string[];
  const profiles = Profiles.find(
    { _id: { $in: hunters } },
    { sort: { displayName: 1 } },
  ).fetch();

  return { ready: ready as boolean, canInvite, profiles };
});

const HuntProfileListPageContainer = crumb(tracker(HuntProfileListPage));

export default HuntProfileListPageContainer;
