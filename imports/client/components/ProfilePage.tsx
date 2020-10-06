import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { OAuth } from 'meteor/oauth';
import { withTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration, Configuration } from 'meteor/service-configuration';
import { _ } from 'meteor/underscore';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FormCheck from 'react-bootstrap/FormCheck';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import { RouteComponentProps } from 'react-router';
import Flags from '../../flags';
import Profiles from '../../lib/models/profiles';
import { ProfileType } from '../../lib/schemas/profiles';
import Gravatar from './Gravatar';

/* eslint-disable max-len */

interface OthersProfilePageProps {
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  targetIsOperator: boolean;
}

class OthersProfilePage extends React.Component<OthersProfilePageProps> {
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
        {showOperatorBadge && <Badge>operator</Badge>}
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

interface GoogleLinkBlockProps {
  profile: ProfileType;
  googleDisabled: boolean;
  config: Configuration | null;
}

enum GoogleLinkBlockLinkState {
  IDLE = 'idle',
  LINKING = 'linking',
  ERROR = 'error',
}

type GoogleLinkBlockState = {
  state: GoogleLinkBlockLinkState.IDLE | GoogleLinkBlockLinkState.LINKING;
} | {
  state: GoogleLinkBlockLinkState.ERROR;
  error: Error;
}

class GoogleLinkBlock extends React.Component<GoogleLinkBlockProps, GoogleLinkBlockState> {
  constructor(props: GoogleLinkBlockProps) {
    super(props);
    this.state = { state: GoogleLinkBlockLinkState.IDLE };
  }

  onLink = () => {
    this.setState({ state: GoogleLinkBlockLinkState.LINKING });
    Google.requestCredential(this.requestComplete);
  };

  onUnlink = () => {
    Meteor.call('unlinkUserGoogleAccount');
  };

  requestComplete = (token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      this.setState({ state: GoogleLinkBlockLinkState.IDLE });
      return;
    }

    Meteor.call('linkUserGoogleAccount', token, secret, (error?: Error) => {
      if (error) {
        this.setState({ state: GoogleLinkBlockLinkState.ERROR, error });
      } else {
        this.setState({ state: GoogleLinkBlockLinkState.IDLE });
      }
    });
  };

  dismissAlert = () => {
    this.setState({ state: GoogleLinkBlockLinkState.IDLE });
  };

  errorAlert = () => {
    if (this.state.state === 'error') {
      return (
        <Alert variant="danger" dismissible onClose={this.dismissAlert}>
          Linking Google account failed:
          {' '}
          {this.state.error.message}
        </Alert>
      );
    }
    return null;
  };

  linkButton = () => {
    if (this.state.state === GoogleLinkBlockLinkState.LINKING) {
      return <Button variant="primary" disabled>Linking...</Button>;
    }

    if (this.props.googleDisabled) {
      return <Button variant="primary" disabled>Google integration currently disabled</Button>;
    }

    const text = (this.props.profile.googleAccount) ?
      'Link a different Google account' :
      'Link your Google account';

    return (
      <Button variant="primary" onClick={this.onLink}>
        {text}
      </Button>
    );
  };

  unlinkButton = () => {
    if (this.props.profile.googleAccount) {
      return (
        <Button variant="danger" onClick={this.onUnlink}>
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
        <FormLabel>
          Google Account
        </FormLabel>
        {this.errorAlert()}
        <div>
          {this.currentAccount()}
          {this.linkButton()}
          {' '}
          {this.unlinkButton()}
        </div>
        <FormText>
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
        </FormText>
      </FormGroup>
    );
  }
}

const GoogleLinkBlockContainer = withTracker((_props: { profile: ProfileType }) => {
  const config = ServiceConfiguration.configurations.findOne({ service: 'google' }) as Configuration | null;
  const googleDisabled = Flags.active('disable.google');
  return { config, googleDisabled };
})(GoogleLinkBlock);

interface OwnProfilePageProps {
  initialProfile: ProfileType;
  operating: boolean;
  canMakeOperator: boolean;
}

enum OwnProfilePageSubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  ERROR = 'error',
}

interface OwnProfilePageState {
  displayNameValue: string;
  phoneNumberValue: string;
  slackHandleValue: string;
  muteApplause: boolean;
  submitState: OwnProfilePageSubmitState,
  submitError: string;
}

class OwnProfilePage extends React.Component<OwnProfilePageProps, OwnProfilePageState> {
  constructor(props: OwnProfilePageProps) {
    super(props);
    this.state = {
      displayNameValue: this.props.initialProfile.displayName || '',
      phoneNumberValue: this.props.initialProfile.phoneNumber || '',
      slackHandleValue: this.props.initialProfile.slackHandle || '',
      muteApplause: this.props.initialProfile.muteApplause || false,
      submitState: OwnProfilePageSubmitState.IDLE,
    } as OwnProfilePageState;
  }

  onDisableApplauseChange = (e: React.FormEvent<HTMLInputElement>) => {
    this.setState({
      muteApplause: e.currentTarget.checked,
    });
  };

  handleDisplayNameFieldChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      displayNameValue: e.currentTarget.value,
    });
  };

  handlePhoneNumberFieldChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      phoneNumberValue: e.currentTarget.value,
    });
  };

  handleSlackHandleFieldChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      slackHandleValue: e.currentTarget.value,
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
      submitState: OwnProfilePageSubmitState.SUBMITTING,
    });
    const newProfile = {
      displayName: this.state.displayNameValue,
      phoneNumber: this.state.phoneNumberValue,
      slackHandle: this.state.slackHandleValue,
      muteApplause: this.state.muteApplause,
    };
    Meteor.call('saveProfile', newProfile, (error?: Error) => {
      if (error) {
        this.setState({
          submitState: OwnProfilePageSubmitState.ERROR,
          submitError: error.message,
        });
      } else {
        this.setState({
          submitState: OwnProfilePageSubmitState.SUCCESS,
        });
      }
    });
  };

  dismissAlert = () => {
    this.setState({
      submitState: OwnProfilePageSubmitState.IDLE,
    });
  };

  render() {
    const shouldDisableForm = (this.state.submitState === 'submitting');
    return (
      <div>
        <h1>Account information</h1>
        {this.props.canMakeOperator ? <FormCheck type="checkbox" checked={this.props.operating} onChange={this.toggleOperating} label="Operating" /> : null}
        <FormGroup>
          <FormLabel htmlFor="jr-profile-edit-email">
            Email address
          </FormLabel>
          <FormControl
            id="jr-profile-edit-email"
            type="text"
            value={this.props.initialProfile.primaryEmail}
            disabled
          />
          <FormText>
            This is the email address associated with your account.  The profile picture below is the image associated with that email address from
            {' '}
            <a href="https://gravatar.com">gravatar.com</a>
            .
          </FormText>
          <Gravatar email={this.props.initialProfile.primaryEmail} />
        </FormGroup>
        {this.state.submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === 'success' ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === 'error' ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
          </Alert>
        ) : null}

        <GoogleLinkBlockContainer profile={this.props.initialProfile} />

        <FormGroup>
          <FormLabel htmlFor="jr-profile-edit-display-name">
            Display name
          </FormLabel>
          <FormControl
            id="jr-profile-edit-display-name"
            type="text"
            value={this.state.displayNameValue}
            disabled={shouldDisableForm}
            onChange={this.handleDisplayNameFieldChange}
          />
          <FormText>
            We suggest your full name, to avoid ambiguity.
          </FormText>
        </FormGroup>

        <FormGroup>
          <FormLabel htmlFor="jr-profile-edit-slack">
            Slack handle
          </FormLabel>
          <FormControl
            id="jr-profile-edit-slack"
            type="text"
            value={this.state.slackHandleValue}
            disabled={shouldDisableForm}
            onChange={this.handleSlackHandleFieldChange}
          />
          <FormText>
            So we can connect your chat there with your account here. If you haven&apos;t signed up for a Slack account yet, there should be a notification in the top-right that you can use to get an invite. (Slack handles contain letters, numbers, periods, and underscores. You don&apos;t need the leading
            {' '}
            <code>@</code>
            .)
          </FormText>
        </FormGroup>

        <FormGroup>
          <FormLabel htmlFor="jr-profile-edit-phone">
            Phone number (optional)
          </FormLabel>
          <FormControl
            id="jr-profile-edit-phone"
            type="text"
            value={this.state.phoneNumberValue}
            disabled={shouldDisableForm}
            onChange={this.handlePhoneNumberFieldChange}
          />
          <FormText>
            In case we need to reach you via phone.
          </FormText>
        </FormGroup>

        <FormGroup>
          <FormCheck type="checkbox" checked={this.state.muteApplause} onChange={this.onDisableApplauseChange} label="Mute applause" />
          <FormText>
            Enable this option if you find the applause sound when we solve a puzzle annoying.
          </FormText>
        </FormGroup>

        <FormGroup>
          <Button
            type="submit"
            variant="primary"
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

interface ProfilePageParams {
  userId: string;
}

interface ProfilePageWithRouterParams extends RouteComponentProps<ProfilePageParams> {
}

interface ProfilePageProps extends ProfilePageWithRouterParams {
  ready: boolean;
  isSelf: boolean;
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  viewerIsOperator: boolean;
  targetIsOperator: boolean;
}

class ProfilePage extends React.Component<ProfilePageProps> {
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

const usersCrumb = withBreadcrumb<ProfilePageWithRouterParams>({ title: 'Users', path: '/users' });
const userCrumb = withBreadcrumb(({ match, ready, profile }: ProfilePageProps) => {
  return { title: ready ? profile.displayName : 'loading...', path: `/users/${match.params.userId}` };
});
const tracker = withTracker(({ match }: ProfilePageWithRouterParams) => {
  const uid = match.params.userId === 'me' ? Meteor.userId()! : match.params.userId;

  const profileHandle = Meteor.subscribe('mongo.profiles', { _id: uid });
  const userRolesHandle = Meteor.subscribe('userRoles', uid);
  const user = Meteor.user()!;
  const defaultEmail = user.emails![0].address!;
  const data = {
    ready: !!user && profileHandle.ready() && userRolesHandle.ready(),
    isSelf: (Meteor.userId() === uid),
    profile: Profiles.findOne(uid) || {
      _id: uid,
      displayName: '',
      primaryEmail: defaultEmail,
      phoneNumber: '',
      slackHandle: '',
      deleted: false,
      createdAt: new Date(),
      createdBy: user._id,
      updatedAt: undefined,
      updatedBy: undefined,
      googleAccount: undefined,
      muteApplause: undefined,
    },
    viewerCanMakeOperator: Roles.userHasPermission(Meteor.userId(), 'users.makeOperator'),
    viewerIsOperator: Roles.userHasRole(Meteor.userId()!, 'operator'),
    targetIsOperator: Roles.userHasPermission(uid, 'users.makeOperator'),
  };
  return data;
});

const ProfilePageContainer = usersCrumb(tracker(userCrumb(ProfilePage)));

export default ProfilePageContainer;
