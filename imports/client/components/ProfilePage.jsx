import { Meteor } from 'meteor/meteor';
import React from 'react';
import BS from 'react-bootstrap';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { ReactMeteorData } from 'meteor/react-meteor-data';

/* eslint-disable max-len */

const OthersProfilePage = React.createClass({
  propTypes: {
    profile: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
    viewerIsAdmin: React.PropTypes.bool.isRequired,
    targetIsAdmin: React.PropTypes.bool.isRequired,
  },

  makeOperator() {
    Meteor.call('makeOperator', this.props.profile._id);
  },

  render() {
    // TODO: figure out something for profile pictures - gravatar?
    const profile = this.props.profile;
    const showOperatorBadge = this.props.targetIsAdmin;
    const showMakeOperatorButton = this.props.viewerIsAdmin && !this.props.targetIsAdmin;
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
    profile: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
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
    initialProfile: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
    operating: React.PropTypes.bool,
    isOperator: React.PropTypes.bool,
  },
  getInitialState() {
    return {
      displayNameValue: this.props.initialProfile.displayName || '',
      phoneNumberValue: this.props.initialProfile.phoneNumber || '',
      slackHandleValue: this.props.initialProfile.slackHandle || '',
      submitState: 'idle', // One of 'idle', 'submitting', 'success', or 'error'
      submitError: '',
    };
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
    Meteor.users.update(Meteor.userId(), {
      $set: {
        'profile.operating': newState,
      },
    });
  },

  handleSaveForm() {
    this.setState({
      submitState: 'submitting',
    });
    const newProfile = {
      displayName: this.state.displayNameValue,
      phoneNumber: this.state.phoneNumberValue,
      slackHandle: this.state.slackHandleValue,
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
        {this.props.isOperator ? <BS.Checkbox type="checkbox" checked={this.props.operating} onChange={this.toggleOperating}>Operating</BS.Checkbox> : null}
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

        <BS.FormGroup>
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
            So we can connect your chat there with your account here.
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
    params: React.PropTypes.shape({
      userId: React.PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
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
      viewerIsAdmin: Roles.userHasRole(Meteor.userId(), 'admin'),
      targetIsAdmin: Roles.userHasRole(uid, 'admin'),
      viewerIsOperating: user && user.profile && user.profile.operating,
    };
    return data;
  },

  render() {
    if (!this.data.ready) return <div>loading...</div>;
    if (this.data.isSelf) {
      return (
        <OwnProfilePage
          initialProfile={this.data.profile}
          isOperator={this.data.viewerIsAdmin}
          operating={this.data.viewerIsOperating}
        />
      );
    }
    return (
      <OthersProfilePage
        profile={this.data.profile}
        viewerIsAdmin={this.data.viewerIsAdmin}
        targetIsAdmin={this.data.targetIsAdmin}
      />
    );
  },
});

export { ProfilePage };
