import React from 'react';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import subsCache from '../subsCache.js';
import navAggregatorType from './navAggregatorType.jsx';
import ProfileList from './ProfileList.jsx';

const AllProfileListPage = React.createClass({
  propTypes: {
    ready: PropTypes.bool.isRequired,
    profiles: PropTypes.arrayOf(PropTypes.shape(Schemas.Profiles.asReactPropTypes())).isRequired,
  },

  contextTypes: {
    navAggregator: navAggregatorType,
  },

  render() {
    let body;
    if (!this.props.ready) {
      body = <div>loading...</div>;
    } else {
      body = <ProfileList profiles={this.props.profiles} />;
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

export default withTracker(() => {
  const profilesHandle = subsCache.subscribe('mongo.profiles');
  const ready = profilesHandle.ready();
  const profiles = ready ? Models.Profiles.find({}, { sort: { displayName: 1 } }).fetch() : [];
  return {
    ready,
    profiles,
  };
})(AllProfileListPage);
