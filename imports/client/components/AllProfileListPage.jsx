import React from 'react';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import subsCache from '../subsCache.js';
import navAggregatorType from './navAggregatorType.jsx';
import ProfileList from './ProfileList.jsx';

const AllProfileListPage = React.createClass({
  contextTypes: {
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const profilesHandle = subsCache.subscribe('mongo.profiles');
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
