import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import React from 'react';
import BS from 'react-bootstrap';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import JRPropTypes from '../JRPropTypes.js';
import { navAggregatorType } from './NavAggregator.jsx';

/* eslint-disable max-len */

const OthersProfilePage = React.createClass({
  propTypes: {
    profile: PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
    viewerCanMakeOperator: PropTypes.bool.isRequired,
    targetIsAdmin: PropTypes.bool.isRequired,
  },

  makeOperator() {
    Meteor.call('makeOperator', this.props.profile._id);
  },

  render() {
    // TODO: figure out something for profile pictures - gravatar?
    const profile = this.props.profile;
    const showOperatorBadge = this.props.targetIsAdmin;
    const showMakeOperatorButton = this.props.viewerCanMakeOperator && !this.props.targetIsAdmin;
    return (
      <div>
        <h1>{profile.displayName}</h1>
        {showOperatorBadge && <BS.Label>operator</BS.Label>}
        {showMakeOperatorButton && <BS.Button onClick={this.makeOperator}>Make operator</BS.Button>}
        <div>Email: {profile.primaryEmail}</div>
        {profile.phoneNumber ? <div>Phone: {profile.phoneNumber}</div> : null}
        {profile.slackHandle ? <div>Slack handle: {profile.slackHandle}</div> : null}
      </div>
    );
  },
});

const GoogleLinkBlock = React.createClass({
  propTypes: {
    profile: PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
  },

  mixins: [ReactMeteorData],

  getInitialState() {
    return { state: 'idle' };
  },

  onLink() {
    this.setState({ state: 'linking' });
    Google.requestCredential(this.requestComplete);
  },

  onUnlink() {
    Meteor.call('unlinkUserGoogleAccount');
  },

  getMeteorData() {
    const config = ServiceConfiguration.configurations.findOne({ service: 'google' });
    return { config };
  },

  requestComplete(token) {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      this.setState({ state: 'idle' });
      return;
    }

    Meteor.call('linkUserGoogleAccount', token, secret, (error) => {
      if (error) {
        this.setState({ state: 'error', error });
      } else {
        this.setState({ state: 'idle' });
      }
    });
  },

  dismissAlert() {
    this.setState({ state: 'idle' });
  },

  errorAlert() {
    if (this.state.state === 'error') {
      return (
        <BS.Alert bsStyle="danger" onDismiss={this.dismissAlert}>
          Linking Google account failed: {this.state.error.message}
        </BS.Alert>
      );
    }
    return null;
  },

  linkButton() {
    if (this.state.state === 'linking') {
      return <BS.Button bsStyle="primary" disabled>Linking...</BS.Button>;
    }

    const text = (this.props.profile.googleAccount) ?
      'Link a different Google account' :
      'Link your Google account';

    return (
      <BS.Button bsStyle="primary" onClick={this.onLink}>
        {text}
      </BS.Button>
    );
  },

  unlinkButton() {
    if (this.props.profile.googleAccount) {
      return (
        <BS.Button bsStyle="danger" onClick={this.onUnlink}>
          Unlink
        </BS.Button>
      );
    }

    return null;
  },

  currentAccount() {
    if (this.props.profile.googleAccount) {
      return (
        <div>
          Currently linked to {this.props.profile.googleAccount}
        </div>
      );
    }

    return null;
  },

  render() {
    if (!this.data.config) {
      return <div />;
    }

    return (
      <BS.FormGroup>
        <BS.ControlLabel>
          Google Account
        </BS.ControlLabel>
        {this.errorAlert()}
        <div>
          {this.currentAccount()}
          {this.linkButton()}
          {' '}
          {this.unlinkButton()}
        </div>
        <BS.HelpBlock>
          Linking your Google account isn't required, but this will
          let other people see who you are on puzzles' Google
          Spreadsheet docs (instead of being an
          <a
            href="https://support.google.com/docs/answer/2494888?visit_id=1-636184745566842981-35709989&hl=en&rd=1"
            rel="noopener noreferrer" target="_blank"
          >
            anonymous animal
          </a>), and we'll use it to give you access to our practice
          puzzles. (You can only have one Google account linked, so
          linking a new one will cause us to forget the old one).
        </BS.HelpBlock>
      </BS.FormGroup>
    );
  },
});

const OwnProfilePage = React.createClass({
  propTypes: {
    initialProfile: PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
    operating: PropTypes.bool,
    canMakeOperator: PropTypes.bool,
  },
  getInitialState() {
    return {
      displayNameValue: this.props.initialProfile.displayName || '',
      phoneNumberValue: this.props.initialProfile.phoneNumber || '',
      slackHandleValue: this.props.initialProfile.slackHandle || '',
      muteApplause: this.props.initialProfile.muteApplause || false,
      submitState: 'idle', // One of 'idle', 'submitting', 'success', or 'error'
      submitError: '',
    };
  },

  onDisableApplauseChange(e) {
    this.setState({
      muteApplause: e.target.checked,
    });
  },

  getSlackHandleValidationState() {
    if (!this.state.slackHandleValue) {
      return null;
    }

    const valid = Schemas.Profiles.namedContext().validateOne({
      slackHandle: this.state.slackHandleValue,
    }, 'slackHandle');
    return valid ? 'success' : 'error';
  },

  handleDisplayNameFieldChange(e) {
    this.setState({
      displayNameValue: e.target.value,
    });
  },

  handlePhoneNumberFieldChange(e) {
    this.setState({
      phoneNumberValue: e.target.value,
    });
  },

  handleSlackHandleFieldChange(e) {
    this.setState({
      slackHandleValue: e.target.value,
    });
  },

  toggleOperating() {
    const newState = !this.props.operating;
    if (newState) {
      Meteor.call('makeOperator', Meteor.userId());
    } else {
      Meteor.call('stopOperating');
    }
  },

  handleSaveForm() {
    this.setState({
      submitState: 'submitting',
    });
    const newProfile = {
      displayName: this.state.displayNameValue,
      phoneNumber: this.state.phoneNumberValue,
      slackHandle: this.state.slackHandleValue,
      muteApplause: this.state.muteApplause,
    };
    Meteor.call('saveProfile', newProfile, (error) => {
      if (error) {
        this.setState({
          submitState: 'error',
          submitError: error.message,
        });
      } else {
        this.setState({
          submitState: 'success',
        });
      }
    });
  },

  dismissAlert() {
    this.setState({
      submitState: 'idle',
      submitError: '',
    });
  },

  styles: {
    radioheader: {
      fontWeight: 'bold',
    },
  },

  render() {
    const shouldDisableForm = (this.state.submitState === 'submitting');
    return (
      <div>
        <h1>Account information</h1>
        {this.props.canMakeOperator ? <BS.Checkbox type="checkbox" checked={this.props.operating} onChange={this.toggleOperating}>Operating</BS.Checkbox> : null}
        {/* TODO: picture/gravatar */}
        <BS.FormGroup>
          <BS.ControlLabel htmlFor="jr-profile-edit-email">
            Email address
          </BS.ControlLabel>
          <BS.FormControl
            id="jr-profile-edit-email"
            type="text"
            value={this.props.initialProfile.primaryEmail}
            disabled
          />
          <BS.HelpBlock>
            This is the email address associated with your account.
          </BS.HelpBlock>
        </BS.FormGroup>
        {this.state.submitState === 'submitting' ? <BS.Alert bsStyle="info">Saving...</BS.Alert> : null}
        {this.state.submitState === 'success' ? <BS.Alert bsStyle="success" dismissAfter={5000} onDismiss={this.dismissAlert}>Saved changes.</BS.Alert> : null}
        {this.state.submitState === 'error' ? <BS.Alert bsStyle="danger" onDismiss={this.dismissAlert}>Saving failed: {this.state.submitError}</BS.Alert> : null}

        <GoogleLinkBlock profile={this.props.initialProfile} />

        <BS.FormGroup>
          <BS.ControlLabel htmlFor="jr-profile-edit-display-name">
            Display name
          </BS.ControlLabel>
          <BS.FormControl
            id="jr-profile-edit-display-name"
            type="text"
            value={this.state.displayNameValue}
            disabled={shouldDisableForm}
            onChange={this.handleDisplayNameFieldChange}
          />
          <BS.HelpBlock>
            We suggest your full name, to avoid ambiguity.
          </BS.HelpBlock>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor="jr-profile-edit-phone">
            Phone number (optional)
          </BS.ControlLabel>
          <BS.FormControl
            id="jr-profile-edit-phone"
            type="text"
            value={this.state.phoneNumberValue}
            disabled={shouldDisableForm}
            onChange={this.handlePhoneNumberFieldChange}
          />
          <BS.HelpBlock>
            In case we need to reach you via phone.
          </BS.HelpBlock>
        </BS.FormGroup>

        <BS.FormGroup validationState={this.getSlackHandleValidationState()}>
          <BS.ControlLabel htmlFor="jr-profile-edit-slack">
            Slack handle (optional)
          </BS.ControlLabel>
          <BS.FormControl
            id="jr-profile-edit-slack"
            type="text"
            value={this.state.slackHandleValue}
            disabled={shouldDisableForm}
            onChange={this.handleSlackHandleFieldChange}
          />
          <BS.HelpBlock>
            So we can connect your chat there with your account here. If you haven't signed up for a Slack account yet, there should be a notification in the top-right that you can use to get an invite. (Slack handles contain letters, numbers, periods, and underscores. You don't need the leading <code>@</code>.)
          </BS.HelpBlock>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.Checkbox type="checkbox" checked={this.state.muteApplause} onChange={this.onDisableApplauseChange}>
            Mute applause
          </BS.Checkbox>
          <BS.HelpBlock>
            Enable this option if you find the applause sound when we solve a puzzle annoying.
          </BS.HelpBlock>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.Button
            type="submit"
            bsStyle="primary"
            disabled={shouldDisableForm}
            onClick={this.handleSaveForm}
          >
            Save
          </BS.Button>
        </BS.FormGroup>
      </div>
    );
  },
});

const ProfilePage = React.createClass({
  propTypes: {
    params: PropTypes.shape({
      userId: PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const uid = this.props.params.userId === 'me' ? Meteor.userId() : this.props.params.userId;

    const profileHandle = this.context.subs.subscribe('mongo.profiles', { _id: uid });
    const userRolesHandle = this.context.subs.subscribe('userRoles', uid);
    const user = Meteor.user();
    const defaultEmail = user && user.emails && user.emails.length > 0 && user.emails[0] && user.emails[0].address;
    const data = {
      ready: user && profileHandle.ready() && userRolesHandle.ready(),
      isSelf: (Meteor.userId() === uid),
      profile: Models.Profiles.findOne(uid) || {
        _id: uid,
        displayName: '',
        primaryEmail: defaultEmail,
        phoneNumber: '',
        slackHandle: '',
        deleted: false,
        createdAt: new Date(),
        createdBy: Meteor.userId(),
      },
      viewerCanMakeOperator: Roles.userHasPermission(Meteor.userId(), 'users.makeOperator'),
      viewerIsAdmin: Roles.userHasRole(Meteor.userId(), 'admin'),
      targetIsAdmin: Roles.userHasPermission(uid, 'users.makeOperator'),
    };
    return data;
  },

  render() {
    let body;
    if (!this.data.ready) {
      body = <div>loading...</div>;
    } else if (this.data.isSelf) {
      body = (
        <OwnProfilePage
          initialProfile={this.data.profile}
          canMakeOperator={this.data.viewerCanMakeOperator}
          operating={this.data.viewerIsAdmin}
        />
      );
    } else {
      body = (
        <OthersProfilePage
          profile={this.data.profile}
          viewerCanMakeOperator={this.data.viewerCanMakeOperator}
          targetIsAdmin={this.data.targetIsAdmin}
        />
      );
    }

    return (
      <this.context.navAggregator.NavItem
        itemKey="users"
        to="/users"
        label="Users"
      >
        <this.context.navAggregator.NavItem
          itemKey="userid"
          to={`/users/${this.props.params.userId}`}
          label={this.data.ready ? this.data.profile.displayName : 'loading...'}
        >
          {body}
        </this.context.navAggregator.NavItem>
      </this.context.navAggregator.NavItem>
    );
  },
});

export default ProfilePage;
