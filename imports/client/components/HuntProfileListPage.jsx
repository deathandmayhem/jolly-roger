import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import React from 'react';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import subsCache from '../subsCache.js';
import navAggregatorType from './navAggregatorType.jsx';
import ProfileList from './ProfileList.jsx';

const HuntProfileListPage = React.createClass({
  propTypes: {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const usersHandle = subsCache.subscribe('huntMembers', this.props.params.huntId);
    const profilesHandle = subsCache.subscribe('mongo.profiles');

    const ready = usersHandle.ready() && profilesHandle.ready();
    if (!ready) {
      return { ready };
    }

    const canInvite = Roles.userHasPermission(
      Meteor.userId(), 'hunt.join', this.props.params.huntId
    );

    const hunters = Meteor.users.find({ hunts: this.props.params.huntId }).map(u => u._id);
    const profiles = Models.Profiles.find(
      { _id: { $in: hunters } },
      { sort: { displayName: 1 } },
    ).fetch();

    return { ready, canInvite, profiles };
  },

  renderBody() {
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
  },

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
  },
});

export default HuntProfileListPage;
