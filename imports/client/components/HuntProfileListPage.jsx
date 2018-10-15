import { Meteor } from 'meteor/meteor';
import React from 'react';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import JRPropTypes from '../JRPropTypes.js';
import { navAggregatorType } from './NavAggregator.jsx';
import ProfileList from './ProfileList.jsx';

const HuntProfileListPage = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const usersHandle = this.context.subs.subscribe('huntMembers', this.props.params.huntId);
    const profilesHandle = this.context.subs.subscribe('mongo.profiles');

    const ready = usersHandle.ready() && profilesHandle.ready();
    if (!ready) {
      return { ready };
    }

    const canInvite = Roles.userHasPermission(
      Meteor.userId(), 'hunt.join', this.props.params.huntId);

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
