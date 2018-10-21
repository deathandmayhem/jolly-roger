import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import subsCache from '../subsCache.js';
import navAggregatorType from './navAggregatorType.jsx';
import ProfileList from './ProfileList.jsx';

class HuntProfileListPage extends React.Component {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    canInvite: PropTypes.bool.isRequired,
    profiles: PropTypes.arrayOf(PropTypes.shape(Schemas.Profiles.asReactPropTypes())).isRequired,
  };

  static contextTypes = {
    navAggregator: navAggregatorType,
  };

  renderBody = () => {
    if (!this.data.ready) {
      return <div>loading...</div>;
    }

    return (
      <ProfileList
        profiles={this.data.profiles}
        huntId={this.props.params.huntId}
        canInvite={this.data.canInvite}
      />
    );
  };

  render() {
    return (
      <this.context.navAggregator.NavItem
        itemKey="hunters"
        to={`/hunts/${this.props.params.huntId}/hunters`}
        label="Hunters"
      >
        {this.renderBody()}
      </this.context.navAggregator.NavItem>
    );
  }
}

const HuntProfileListPageContainer = withTracker(({ params }) => {
  const usersHandle = subsCache.subscribe('huntMembers', params.huntId);
  const profilesHandle = subsCache.subscribe('mongo.profiles');

  const ready = usersHandle.ready() && profilesHandle.ready();
  if (!ready) {
    return { ready };
  }

  const canInvite = Roles.userHasPermission(
    Meteor.userId(), 'hunt.join', params.huntId
  );

  const hunters = Meteor.users.find({ hunts: params.huntId }).map(u => u._id);
  const profiles = Models.Profiles.find(
    { _id: { $in: hunters } },
    { sort: { displayName: 1 } },
  ).fetch();

  return { ready, canInvite, profiles };
})(HuntProfileListPage);

HuntProfileListPageContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};

export default HuntProfileListPage;
