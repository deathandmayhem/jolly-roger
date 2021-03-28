import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { withTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration, Configuration } from 'meteor/service-configuration';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import FormCheck from 'react-bootstrap/FormCheck';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import Flags from '../../flags';
import { ProfileType } from '../../lib/schemas/profiles';
import { requestDiscordCredential } from '../discord';
import TeamName from '../team_name';
import AudioConfig from './AudioConfig';
import Gravatar from './Gravatar';

interface GoogleLinkBlockProps {
  profile: ProfileType;
  googleDisabled: boolean;
  config: Configuration | undefined;
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
  const config = ServiceConfiguration.configurations.findOne({ service: 'google' }) as Configuration | undefined;
  const googleDisabled = Flags.active('disable.google');
  return { config, googleDisabled };
})(GoogleLinkBlock);

enum DiscordLinkBlockLinkState {
  IDLE = 'idle',
  LINKING = 'linking',
  ERROR = 'error',
}

interface DiscordLinkBlockProps {
  profile: ProfileType;
  config: Configuration | undefined;
  discordDisabled: boolean;
  teamName: string;
}

type DiscordLinkBlockState = {
  state: DiscordLinkBlockLinkState.IDLE | DiscordLinkBlockLinkState.LINKING;
} | {
  state: DiscordLinkBlockLinkState.ERROR;
  error: Error;
}

class DiscordLinkBlock extends React.Component<DiscordLinkBlockProps, DiscordLinkBlockState> {
  constructor(props: DiscordLinkBlockProps) {
    super(props);
    this.state = {
      state: DiscordLinkBlockLinkState.IDLE,
    };
  }

  onLink = () => {
    this.setState({ state: DiscordLinkBlockLinkState.LINKING });
    requestDiscordCredential(this.requestComplete);
  };

  onUnlink = () => {
    Meteor.call('unlinkUserDiscordAccount');
  };

  requestComplete = (token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      this.setState({ state: DiscordLinkBlockLinkState.IDLE });
      return;
    }

    Meteor.call('linkUserDiscordAccount', token, secret, (error?: Error) => {
      if (error) {
        this.setState({ state: DiscordLinkBlockLinkState.ERROR, error });
      } else {
        this.setState({ state: DiscordLinkBlockLinkState.IDLE });
      }
    });
  };

  dismissAlert = () => {
    this.setState({ state: DiscordLinkBlockLinkState.IDLE });
  };

  errorAlert = () => {
    if (this.state.state === 'error') {
      return (
        <Alert variant="danger" dismissible onClose={this.dismissAlert}>
          Linking Discord account failed:
          {' '}
          {this.state.error.message}
        </Alert>
      );
    }
    return null;
  };

  linkButton = () => {
    if (this.state.state === DiscordLinkBlockLinkState.LINKING) {
      return <Button variant="primary" disabled>Linking...</Button>;
    }

    if (this.props.discordDisabled) {
      return <Button variant="primary" disabled>Discord integration currently disabled</Button>;
    }

    const text = (this.props.profile.discordAccount) ?
      'Link a different Discord account' :
      'Link your Discord account';

    return (
      <Button variant="primary" onClick={this.onLink}>
        {text}
      </Button>
    );
  };

  unlinkButton = () => {
    if (this.props.profile.discordAccount) {
      return (
        <Button variant="danger" onClick={this.onUnlink}>
          Unlink
        </Button>
      );
    }

    return null;
  };

  currentAccount = () => {
    if (this.props.profile.discordAccount) {
      const acct = this.props.profile.discordAccount;
      return (
        <div>
          Currently linked to
          {' '}
          {acct.username}
          #
          {acct.discriminator}
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
          Discord account
        </FormLabel>
        {this.errorAlert()}
        <div>
          {this.currentAccount()}
          {this.linkButton()}
          {' '}
          {this.unlinkButton()}
        </div>
        <FormText>
          Linking your Discord account will add you to the
          {' '}
          {this.props.teamName}
          {' '}
          Discord server.  Additionally, we&apos;ll be able to link up your identity
          there and in jolly-roger chat.
        </FormText>
      </FormGroup>
    );
  }
}

const DiscordLinkBlockContainer = withTracker((_props: { profile: ProfileType }) => {
  const config = ServiceConfiguration.configurations.findOne({ service: 'discord' });
  const discordDisabled = Flags.active('disable.discord');
  Meteor.subscribe('teamName');
  const teamNameObj = TeamName.findOne('teamName');
  const teamName = teamNameObj ? teamNameObj.name : 'Default Team Name';
  return {
    config,
    discordDisabled,
    teamName,
  };
})(DiscordLinkBlock);

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
  muteApplause: boolean;
  dingwords: string;
  submitState: OwnProfilePageSubmitState,
  submitError: string;
}

class OwnProfilePage extends React.Component<OwnProfilePageProps, OwnProfilePageState> {
  constructor(props: OwnProfilePageProps) {
    super(props);
    this.state = {
      displayNameValue: this.props.initialProfile.displayName || '',
      phoneNumberValue: this.props.initialProfile.phoneNumber || '',
      muteApplause: this.props.initialProfile.muteApplause || false,
      dingwords: this.props.initialProfile.dingwords ?
        this.props.initialProfile.dingwords.join(',') : '',
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

  handleDingwordsChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      dingwords: e.currentTarget.value,
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
    const dingwords = this.state.dingwords.split(',').map((x) => {
      return x.trim().toLowerCase();
    }).filter((x) => x.length > 0);
    const newProfile = {
      displayName: this.state.displayNameValue,
      phoneNumber: this.state.phoneNumberValue,
      muteApplause: this.state.muteApplause,
      dingwords,
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
            This is the email address associated with your account.  The
            profile picture below is the image associated with that email
            address from
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

        <DiscordLinkBlockContainer profile={this.props.initialProfile} />

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
          <FormLabel htmlFor="jr-profile-edit-dingwords">
            Dingwords (experimental)
          </FormLabel>
          <FormControl
            id="jr-profile-edit-dingwords"
            type="text"
            value={this.state.dingwords}
            disabled={shouldDisableForm}
            onChange={this.handleDingwordsChange}
            placeholder="cryptic,biology,chemistry"
          />
          <FormText>
            Get an in-app notification if anyone sends a chat message
            containing one of your comma-separated, case-insensitive dingwords
            as a substring.  This feature is experimental and may be disabled
            without notice.
          </FormText>
        </FormGroup>

        <FormGroup>
          <FormCheck
            type="checkbox"
            checked={this.state.muteApplause}
            onChange={this.onDisableApplauseChange}
            label="Mute applause"
          />
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

        <AudioConfig />
      </div>
    );
  }
}

export default OwnProfilePage;
