import React from 'react';
import JRPropTypes from '/imports/client/JRPropTypes.js';
import { navAggregatorType } from '/imports/client/components/NavAggregator.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import ProfileList from '/imports/client/components/ProfileList.jsx';

const AllProfileListPage = React.createClass({
  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const profilesHandle = this.context.subs.subscribe('mongo.profiles');
    const ready = profilesHandle.ready();
    const profiles = ready ? Models.Profiles.find({}, { sort: { displayName: 1 } }).fetch() : [];
    return {
      ready,
      profiles,
    };
  },

  render() {
    let body;
    if (!this.data.ready) {
      body = <div>loading...</div>;
    } else {
      body = <ProfileList profiles={this.data.profiles} />;
    }

    return (
      <this.context.navAggregator.NavItem
        itemKey="users"
        to="/users"
        label="Users"
      >
        {body}
      </this.context.navAggregator.NavItem>
    );
  },
});

export default AllProfileListPage;
