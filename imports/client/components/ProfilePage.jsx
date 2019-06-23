import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { OAuth } from 'meteor/oauth';
import { Google } from 'meteor/google-oauth';
import { Roles } from 'meteor/nicolaslopezj:roles';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import Checkbox from 'react-bootstrap/lib/Checkbox';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import HelpBlock from 'react-bootstrap/lib/HelpBlock';
import Label from 'react-bootstrap/lib/Label';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import ProfilesSchema from '../../lib/schemas/profiles';
import Profiles from '../../lib/models/profiles';
import Flags from '../../flags';
import Gravatar from './Gravatar';

/* eslint-disable max-len */

class OthersProfilePage extends React.Component {
  static propTypes = {
    profile: PropTypes.shape(ProfilesSchema.asReactPropTypes()),
    viewerCanMakeOperator: PropTypes.bool.isRequired,
    targetIsOperator: PropTypes.bool.isRequired,
  };

  makeOperator = () => {
    Meteor.call('makeOperator', this.props.profile._id);
  };

  render() {
    const profile = this.props.profile;
    const showOperatorBadge = this.props.targetIsOperator;
    const showMakeOperatorButton = this.props.viewerCanMakeOperator && !this.props.targetIsOperator;
    return (
      <div>
        <h1>{profile.displayName}</h1>
        {showOperatorBadge && <Label>operator</Label>}
        {showMakeOperatorButton && <Button onClick={this.makeOperator}>Make operator</Button>}
        <Gravatar email={profile.primaryEmail} />
        <div>
          Email:
          {' '}
          {profile.primaryEmail}
        </div>
        {profile.phoneNumber ? (
          <div>
            Phone:
            {' '}
            {profile.phoneNumber}
          </div>
        ) : null}
        {profile.slackHandle ? (
          <div>
            Slack handle:
            {' '}
            {profile.slackHandle}
          </div>
        ) : null}
      </div>
    );
  }
}

class GoogleLinkBlock extends React.Component {
  static propTypes = {
    profile: PropTypes.shape(ProfilesSchema.asReactPropTypes()),
    googleDisabled: PropTypes.bool.isRequired,
    config: PropTypes.object,
  };

  state = { state: 'idle' };

  onLink = () => {
    this.setState({ state: 'linking' });
    Google.requestCredential(this.requestComplete);
  };

  onUnlink = () => {
    Meteor.call('unlinkUserGoogleAccount');
  };

  requestComplete = (token) => {
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
  };

  dismissAlert = () => {
    this.setState({ state: 'idle' });
  };

  errorAlert = () => {
    if (this.state.state === 'error') {
      return (
        <Alert bsStyle="danger" onDismiss={this.dismissAlert}>
          Linking Google account failed:
          {' '}
          {this.state.error.message}
        </Alert>
      );
    }
    return null;
  };

  linkButton = () => {
    if (this.state.state === 'linking') {
      return <Button bsStyle="primary" disabled>Linking...</Button>;
    }

    if (this.props.googleDisabled) {
      return <Button bsStyle="primary" disabled>Google integration currently disabled</Button>;
    }

    const text = (this.props.profile.googleAccount) ?
      'Link a different Google account' :
      'Link your Google account';

    return (
      <Button bsStyle="primary" onClick={this.onLink}>
        {text}
      </Button>
    );
  };

  unlinkButton = () => {
    if (this.props.profile.googleAccount) {
      return (
        <Button bsStyle="danger" onClick={this.onUnlink}>
          Unlink
        </Button>
      );
    }

    return null;
  };

  currentAccount = () => {
    if (this.props.profile.googleAccount) {
      return (
        <div>
          Currently linked to
          {' '}
          {this.props.profile.googleAccount}
        </div>
      );
    }

    return null;
  };

  render() {
    if (!this.props.config) {
      return <div />;
    }

    return (
      <FormGroup>
        <ControlLabel>
          Google Account
        </ControlLabel>
        {this.errorAlert()}
        <div>
          {this.currentAccount()}
          {this.linkButton()}
          {' '}
          {this.unlinkButton()}
        </div>
        <HelpBlock>
          Linking your Google account isn&apos;t required, but this will
          let other people see who you are on puzzles&apos; Google
          Spreadsheet docs (instead of being an
          {' '}
          <a
            href="https://support.google.com/docs/answer/2494888?visit_id=1-636184745566842981-35709989&hl=en&rd=1"
            rel="noopener noreferrer"
            target="_blank"
          >
            anonymous animal
          </a>
          ), and we&apos;ll use it to give you access to our practice
          puzzles. (You can only have one Google account linked, so
          linking a new one will cause us to forget the old one).
        </HelpBlock>
      </FormGroup>
    );
  }
}

const GoogleLinkBlockContainer = withTracker(() => {
  const config = ServiceConfiguration.configurations.findOne({ service: 'google' });
  const googleDisabled = Flags.active('disable.google');
  return { config, googleDisabled };
})(GoogleLinkBlock);

class OwnProfilePage extends React.Component {
  static propTypes = {
    initialProfile: PropTypes.shape(ProfilesSchema.asReactPropTypes()),
    operating: PropTypes.bool,
    canMakeOperator: PropTypes.bool,
  };

  state = {
    displayNameValue: this.props.initialProfile.displayName || '',
    phoneNumberValue: this.props.initialProfile.phoneNumber || '',
    slackHandleValue: this.props.initialProfile.slackHandle || '',
    muteApplause: this.props.initialProfile.muteApplause || false,
    submitState: 'idle', // One of 'idle', 'submitting', 'success', or 'error'
    submitError: '',
  };

  onDisableApplauseChange = (e) => {
    this.setState({
      muteApplause: e.target.checked,
    });
  };

  getSlackHandleValidationState = () => {
    if (!this.state.slackHandleValue) {
      return null;
    }

    const valid = ProfilesSchema.namedContext().validate({
      slackHandle: this.state.slackHandleValue,
    }, { keys: ['slackHandle'] });
    return valid ? 'success' : 'error';
  };

  handleDisplayNameFieldChange = (e) => {
    this.setState({
      displayNameValue: e.target.value,
    });
  };

  handlePhoneNumberFieldChange = (e) => {
    this.setState({
      phoneNumberValue: e.target.value,
    });
  };

  handleSlackHandleFieldChange = (e) => {
    this.setState({
      slackHandleValue: e.target.value,
    });
  };

  toggleOperating = () => {
    const newState = !this.props.operating;
    if (newState) {
      Meteor.call('makeOperator', Meteor.userId());
    } else {
      Meteor.call('stopOperating');
    }
  };

  handleSaveForm = () => {
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
  };

  dismissAlert = () => {
    this.setState({
      submitState: 'idle',
      submitError: '',
    });
  };

  render() {
    const shouldDisableForm = (this.state.submitState === 'submitting');
    return (
      <div>
        <h1>Account information</h1>
        {this.props.canMakeOperator ? <Checkbox type="checkbox" checked={this.props.operating} onChange={this.toggleOperating}>Operating</Checkbox> : null}
        <FormGroup>
          <ControlLabel htmlFor="jr-profile-edit-email">
            Email address
          </ControlLabel>
          <FormControl
            id="jr-profile-edit-email"
            type="text"
            value={this.props.initialProfile.primaryEmail}
            disabled
          />
          <HelpBlock>
            This is the email address associated with your account.  The profile picture below is the image associated with that email address from
            {' '}
            <a href="https://gravatar.com">gravatar.com</a>
            .
          </HelpBlock>
          <Gravatar email={this.props.initialProfile.primaryEmail} />
        </FormGroup>
        {this.state.submitState === 'submitting' ? <Alert bsStyle="info">Saving...</Alert> : null}
        {this.state.submitState === 'success' ? <Alert bsStyle="success" onDismiss={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === 'error' ? (
          <Alert bsStyle="danger" onDismiss={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
          </Alert>
        ) : null}

        <GoogleLinkBlockContainer profile={this.props.initialProfile} />

        <FormGroup>
          <ControlLabel htmlFor="jr-profile-edit-display-name">
            Display name
          </ControlLabel>
          <FormControl
            id="jr-profile-edit-display-name"
            type="text"
            value={this.state.displayNameValue}
            disabled={shouldDisableForm}
            onChange={this.handleDisplayNameFieldChange}
          />
          <HelpBlock>
            We suggest your full name, to avoid ambiguity.
          </HelpBlock>
        </FormGroup>

        <FormGroup validationState={this.getSlackHandleValidationState()}>
          <ControlLabel htmlFor="jr-profile-edit-slack">
            Slack handle
          </ControlLabel>
          <FormControl
            id="jr-profile-edit-slack"
            type="text"
            value={this.state.slackHandleValue}
            disabled={shouldDisableForm}
            onChange={this.handleSlackHandleFieldChange}
          />
          <HelpBlock>
            So we can connect your chat there with your account here. If you haven&apos;t signed up for a Slack account yet, there should be a notification in the top-right that you can use to get an invite. (Slack handles contain letters, numbers, periods, and underscores. You don&apos;t need the leading
            {' '}
            <code>@</code>
            .)
          </HelpBlock>
        </FormGroup>

        <FormGroup>
          <ControlLabel htmlFor="jr-profile-edit-phone">
            Phone number (optional)
          </ControlLabel>
          <FormControl
            id="jr-profile-edit-phone"
            type="text"
            value={this.state.phoneNumberValue}
            disabled={shouldDisableForm}
            onChange={this.handlePhoneNumberFieldChange}
          />
          <HelpBlock>
            In case we need to reach you via phone.
          </HelpBlock>
        </FormGroup>

        <FormGroup>
          <Checkbox type="checkbox" checked={this.state.muteApplause} onChange={this.onDisableApplauseChange}>
            Mute applause
          </Checkbox>
          <HelpBlock>
            Enable this option if you find the applause sound when we solve a puzzle annoying.
          </HelpBlock>
        </FormGroup>

        <FormGroup>
          <Button
            type="submit"
            bsStyle="primary"
            disabled={shouldDisableForm}
            onClick={this.handleSaveForm}
          >
            Save
          </Button>
        </FormGroup>
      </div>
    );
  }
}

class ProfilePage extends React.Component {
  static propTypes = {
    params: PropTypes.shape({
      userId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    isSelf: PropTypes.bool.isRequired,
    profile: PropTypes.shape(ProfilesSchema.asReactPropTypes()).isRequired,
    viewerCanMakeOperator: PropTypes.bool.isRequired,
    viewerIsOperator: PropTypes.bool.isRequired,
    targetIsOperator: PropTypes.bool.isRequired,
  };

  render() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    } else if (this.props.isSelf) {
      return (
        <OwnProfilePage
          initialProfile={this.props.profile}
          canMakeOperator={this.props.viewerCanMakeOperator}
          operating={this.props.viewerIsOperator}
        />
      );
    }

    return (
      <OthersProfilePage
        profile={this.props.profile}
        viewerCanMakeOperator={this.props.viewerCanMakeOperator}
        targetIsOperator={this.props.targetIsOperator}
      />
    );
  }
}

const usersCrumb = withBreadcrumb({ title: 'Users', link: '/users' });
const userCrumb = withBreadcrumb(({ params, ready, profile }) => {
  return { title: ready ? profile.displayName : 'loading...', link: `/users/${params.userId}` };
});
const tracker = withTracker(({ params }) => {
  const uid = params.userId === 'me' ? Meteor.userId() : params.userId;

  const profileHandle = subsCache.subscribe('mongo.profiles', { _id: uid });
  const userRolesHandle = subsCache.subscribe('userRoles', uid);
  const user = Meteor.user();
  const defaultEmail = user && user.emails && user.emails.length > 0 && user.emails[0] && user.emails[0].address;
  const data = {
    ready: user && profileHandle.ready() && userRolesHandle.ready(),
    isSelf: (Meteor.userId() === uid),
    profile: Profiles.findOne(uid) || {
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
    viewerIsOperator: Roles.userHasRole(Meteor.userId(), 'operator'),
    targetIsOperator: Roles.userHasPermission(uid, 'users.makeOperator'),
  };
  return data;
});

const ProfilePageContainer = _.compose(usersCrumb, tracker, userCrumb)(ProfilePage);
ProfilePageContainer.propTypes = {
  params: PropTypes.shape({
    userId: PropTypes.string.isRequired,
  }).isRequired,
};

export default ProfilePageContainer;
