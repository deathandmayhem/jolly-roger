import React from 'react';
import { _ } from 'meteor/underscore';
import BS from 'react-bootstrap';
import RRBS from 'react-router-bootstrap';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { ReactMeteorData } from 'meteor/react-meteor-data';

const ProfileList = React.createClass({
  propTypes: {
    profiles: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Profiles.asReactPropTypes()
      ).isRequired
    ).isRequired,
  },

  getInitialState() {
    return {
      searchString: '',
    };
  },

  onSearchStringChange() {
    this.setState({
      searchString: this.refs.searchBar.getValue(),
    });
  },

  compileMatcher() {
    const searchKeys = this.state.searchString.split(' ');
    const toMatch = _.chain(searchKeys)
                     .filter((s) => !!s)
                     .map((s) => s.toLowerCase())
                     .value();
    const isInteresting = (profile) => {
      for (let i = 0; i < toMatch.length; i++) {
        const searchKey = toMatch[i];
        if (profile.displayName.toLowerCase().indexOf(searchKey) === -1 &&
            profile.primaryEmail.toLowerCase().indexOf(searchKey) === -1 &&
            (!profile.slackHandle || profile.slackHandle.toLowerCase().indexOf(searchKey) === -1) &&
            (!profile.phoneNumber || profile.phoneNumber.toLowerCase().indexOf(searchKey) === -1)) {
          return false;
        }
      }

      return true;
    };

    return isInteresting;
  },

  clearSearch() {
    this.setState({
      searchString: '',
    });
  },

  render() {
    const remoteCount = _.filter(this.props.profiles, (profile) => {
      return profile.remote;
    }).length;
    const localCount = this.props.profiles.length - remoteCount;
    const profiles = _.filter(this.props.profiles, this.compileMatcher());
    const clearButton = <BS.Button onClick={this.clearSearch}>Clear</BS.Button>;
    return (
      <div>
        <h1>List of hunters</h1>
        <div style={{ textAlign: 'right' }}>
          <div>Total hunters: {this.props.profiles.length}</div>
          <div>Local: {localCount}</div>
          <div>Remote: {remoteCount}</div>
        </div>
        <BS.Input
          id="jr-profile-list-search" type="text" label="Search" placeholder="search by name..."
          value={this.state.searchString} ref="searchBar"
          buttonAfter={clearButton}
          onChange={this.onSearchStringChange}
        />
        <BS.ListGroup>
          <RRBS.LinkContainer to="/users/invite">
            <BS.ListGroupItem>
              <strong>Invite someone...</strong>
            </BS.ListGroupItem>
          </RRBS.LinkContainer>
          {profiles.map((profile) => (
            <RRBS.LinkContainer key={profile._id} to={`/users/${profile._id}`}>
              <BS.ListGroupItem>
                {profile.displayName || '<no name provided>'}
              </BS.ListGroupItem>
            </RRBS.LinkContainer>
          ))}
        </BS.ListGroup>
      </div>
    );
  },
});

const ProfileListPage = React.createClass({
  contextTypes: {
    subs: JRPropTypes.subs,
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
    if (!this.data.ready) {
      return <div>loading...</div>;
    }

    return <ProfileList profiles={this.data.profiles} />;
  },
});

export { ProfileListPage };
