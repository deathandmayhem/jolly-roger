import React from 'react';
import { _ } from 'meteor/underscore';
import BS from 'react-bootstrap';
import RRBS from 'react-router-bootstrap';

const ProfileList = React.createClass({
  propTypes: {
    huntId: React.PropTypes.string,
    canInvite: React.PropTypes.bool,
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

  onSearchStringChange(e) {
    this.setState({
      searchString: e.target.value,
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

  inviteToHuntItem() {
    if (!this.props.huntId || !this.props.canInvite) {
      return null;
    }

    return (
      <RRBS.LinkContainer to={`/hunts/${this.props.huntId}/hunters/invite`}>
        <BS.ListGroupItem>
          <strong>Invite someone...</strong>
        </BS.ListGroupItem>
      </RRBS.LinkContainer>
    );
  },

  globalInfo() {
    if (this.props.huntId) {
      return null;
    }

    return (
      <BS.Alert bsStyle="info">
        This shows everyone registered on Jolly Roger, not just those hunting in this year's
        Mystery Hunt. For that, go to the hunt page and click on "Hunters".
      </BS.Alert>
    );
  },

  render() {
    const profiles = _.filter(this.props.profiles, this.compileMatcher());
    return (
      <div>
        <h1>List of hunters</h1>
        <div className="profiles-summary">
          <div>Total hunters: {this.props.profiles.length}</div>
        </div>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor="jr-profile-list-search">
            Search
          </BS.ControlLabel>
          <BS.InputGroup>
            <BS.FormControl
              id="jr-profile-list-search"
              type="text"
              placeholder="search by name..."
              value={this.state.searchString}
              onChange={this.onSearchStringChange}
            />
            <BS.InputGroup.Button>
              <BS.Button onClick={this.clearSearch}>
                Clear
              </BS.Button>
            </BS.InputGroup.Button>
          </BS.InputGroup>
        </BS.FormGroup>

        {this.globalInfo()}

        <BS.ListGroup>
          {this.inviteToHuntItem()}
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

export default ProfileList;
