import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration } from 'meteor/service-configuration';
import React, { useCallback, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import FormCheck from 'react-bootstrap/FormCheck';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import Flags from '../../flags';
import { getAvatarCdnUrl } from '../../lib/discord';
import { ProfileType } from '../../lib/schemas/profile';
import { requestDiscordCredential } from '../discord';
import TeamName from '../team_name';
import AudioConfig from './AudioConfig';

interface GoogleLinkBlockProps {
  profile: ProfileType;
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

const GoogleLinkBlock = (props: GoogleLinkBlockProps) => {
  const [state, setState] =
    useState<GoogleLinkBlockState>({ state: GoogleLinkBlockLinkState.IDLE });

  const config = useTracker(() => ServiceConfiguration.configurations.findOne({ service: 'google' }), []);
  const googleDisabled = useTracker(() => Flags.active('disable.google'), []);

  const requestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setState({ state: GoogleLinkBlockLinkState.IDLE });
      return;
    }

    Meteor.call('linkUserGoogleAccount', token, secret, (error?: Error) => {
      if (error) {
        setState({ state: GoogleLinkBlockLinkState.ERROR, error });
      } else {
        setState({ state: GoogleLinkBlockLinkState.IDLE });
      }
    });
  }, []);

  const onLink = useCallback(() => {
    setState({ state: GoogleLinkBlockLinkState.LINKING });
    Google.requestCredential(requestComplete);
  }, [requestComplete]);

  const onUnlink = useCallback(() => {
    Meteor.call('unlinkUserGoogleAccount');
  }, []);

  const dismissAlert = useCallback(() => {
    setState({ state: GoogleLinkBlockLinkState.IDLE });
  }, []);

  const linkButton = () => {
    if (state.state === GoogleLinkBlockLinkState.LINKING) {
      return <Button variant="primary" disabled>Linking...</Button>;
    }

    if (googleDisabled) {
      return <Button variant="primary" disabled>Google integration currently disabled</Button>;
    }

    const text = (props.profile.googleAccount) ?
      'Link a different Google account' :
      'Link your Google account';

    return (
      <Button variant="primary" onClick={onLink}>
        {text}
      </Button>
    );
  };

  if (!config) {
    return <div />;
  }

  return (
    <FormGroup>
      <FormLabel>
        Google Account
      </FormLabel>
      {state.state === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Linking Google account failed:
          {' '}
          {state.error.message}
        </Alert>
      ) : undefined}
      <div>
        {props.profile.googleAccount ? (
          <div>
            Currently linked to
            {' '}
            {props.profile.googleAccount}
          </div>
        ) : undefined}
        {linkButton()}
        {' '}
        {props.profile.googleAccount ? (
          <Button variant="danger" onClick={onUnlink}>
            Unlink
          </Button>
        ) : undefined}
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
};

enum DiscordLinkBlockLinkState {
  IDLE = 'idle',
  LINKING = 'linking',
  ERROR = 'error',
}

interface DiscordLinkBlockProps {
  profile: ProfileType;
}

type DiscordLinkBlockState = {
  state: DiscordLinkBlockLinkState.IDLE | DiscordLinkBlockLinkState.LINKING;
} | {
  state: DiscordLinkBlockLinkState.ERROR;
  error: Error;
}

const DiscordLinkBlock = (props: DiscordLinkBlockProps) => {
  const [state, setState] =
    useState<DiscordLinkBlockState>({ state: DiscordLinkBlockLinkState.IDLE });

  useSubscribe('teamName');

  const config = useTracker(() => ServiceConfiguration.configurations.findOne({ service: 'discord' }), []);
  const discordDisabled = useTracker(() => Flags.active('disable.discord'), []);
  const teamName = useTracker(() => TeamName.findOne('teamName')?.name ?? 'Default Team Name', []);

  const requestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setState({ state: DiscordLinkBlockLinkState.IDLE });
      return;
    }

    Meteor.call('linkUserDiscordAccount', token, secret, (error?: Error) => {
      if (error) {
        setState({ state: DiscordLinkBlockLinkState.ERROR, error });
      } else {
        setState({ state: DiscordLinkBlockLinkState.IDLE });
      }
    });
  }, []);

  const onLink = useCallback(() => {
    setState({ state: DiscordLinkBlockLinkState.LINKING });
    requestDiscordCredential(requestComplete);
  }, [requestComplete]);

  const onUnlink = useCallback(() => {
    Meteor.call('unlinkUserDiscordAccount');
  }, []);

  const dismissAlert = useCallback(() => {
    setState({ state: DiscordLinkBlockLinkState.IDLE });
  }, []);

  const linkButton = useMemo(() => {
    if (state.state === DiscordLinkBlockLinkState.LINKING) {
      return <Button variant="primary" disabled>Linking...</Button>;
    }

    if (discordDisabled) {
      return <Button variant="primary" disabled>Discord integration currently disabled</Button>;
    }

    const text = (props.profile.discordAccount) ?
      'Link a different Discord account' :
      'Link your Discord account';

    return (
      <Button variant="primary" onClick={onLink}>
        {text}
      </Button>
    );
  }, [state.state, discordDisabled, props.profile.discordAccount, onLink]);

  const unlinkButton = useMemo(() => {
    if (props.profile.discordAccount) {
      return (
        <Button variant="danger" onClick={onUnlink}>
          Unlink
        </Button>
      );
    }

    return null;
  }, [props.profile.discordAccount, onUnlink]);

  const currentAccount = useMemo(() => {
    if (props.profile.discordAccount) {
      const acct = props.profile.discordAccount;
      return (
        <div>
          Currently linked to
          {' '}
          <img src={getAvatarCdnUrl(acct)} alt="Discord Avatar" />
          {' '}
          {acct.username}
          #
          {acct.discriminator}
        </div>
      );
    }

    return null;
  }, [props.profile.discordAccount]);

  if (!config) {
    return <div />;
  }

  return (
    <FormGroup>
      <FormLabel>
        Discord account
      </FormLabel>
      {state.state === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Linking Discord account failed:
          {' '}
          {state.error.message}
        </Alert>
      ) : undefined}
      <div>
        {currentAccount}
        {linkButton}
        {' '}
        {unlinkButton}
      </div>
      <FormText>
        Linking your Discord account will add you to the
        {' '}
        {teamName}
        {' '}
        Discord server.  Additionally, we&apos;ll be able to link up your identity
        there and in jolly-roger chat.
      </FormText>
    </FormGroup>
  );
};

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

const OwnProfilePage = (props: OwnProfilePageProps) => {
  const [displayName, setDisplayName] = useState<string>(props.initialProfile.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(props.initialProfile.phoneNumber || '');
  const [muteApplause, setMuteApplause] =
    useState<boolean>(props.initialProfile.muteApplause || false);
  const [dingwordsFlat, setDingwordsFlat] = useState<string>(props.initialProfile.dingwords ?
    props.initialProfile.dingwords.join(',') : '');
  const [submitState, setSubmitState] =
    useState<OwnProfilePageSubmitState>(OwnProfilePageSubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');

  const onDisableApplauseChange = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    setMuteApplause(e.currentTarget.checked);
  }, []);

  const handleDisplayNameFieldChange: FormControlProps['onChange'] = useCallback((e) => {
    setDisplayName(e.currentTarget.value);
  }, []);

  const handlePhoneNumberFieldChange: FormControlProps['onChange'] = useCallback((e) => {
    setPhoneNumber(e.currentTarget.value);
  }, []);

  const handleDingwordsChange: FormControlProps['onChange'] = useCallback((e) => {
    setDingwordsFlat(e.currentTarget.value);
  }, []);

  const toggleOperating = useCallback(() => {
    const newState = !props.operating;
    if (newState) {
      Meteor.call('makeOperator', Meteor.userId());
    } else {
      Meteor.call('stopOperating');
    }
  }, [props.operating]);

  const handleSaveForm = useCallback(() => {
    setSubmitState(OwnProfilePageSubmitState.SUBMITTING);
    const dingwords = dingwordsFlat.split(',').map((x) => {
      return x.trim().toLowerCase();
    }).filter((x) => x.length > 0);
    const newProfile = {
      displayName,
      phoneNumber,
      muteApplause,
      dingwords,
    };
    Meteor.call('saveProfile', newProfile, (error?: Error) => {
      if (error) {
        setSubmitError(error.message);
        setSubmitState(OwnProfilePageSubmitState.ERROR);
      } else {
        setSubmitState(OwnProfilePageSubmitState.SUCCESS);
      }
    });
  }, [dingwordsFlat, displayName, muteApplause, phoneNumber]);

  const dismissAlert = useCallback(() => {
    setSubmitState(OwnProfilePageSubmitState.IDLE);
  }, []);

  const shouldDisableForm = (submitState === 'submitting');
  return (
    <div>
      <h1>Account information</h1>
      {props.canMakeOperator ? <FormCheck type="checkbox" checked={props.operating} onChange={toggleOperating} label="Operating" /> : null}
      <FormGroup>
        <FormLabel htmlFor="jr-profile-edit-email">
          Email address
        </FormLabel>
        <FormControl
          id="jr-profile-edit-email"
          type="text"
          value={props.initialProfile.primaryEmail}
          disabled
        />
      </FormGroup>
      {submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
      {submitState === 'success' ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {submitState === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {submitError}
        </Alert>
      ) : null}

      <GoogleLinkBlock profile={props.initialProfile} />

      <DiscordLinkBlock profile={props.initialProfile} />

      <FormGroup>
        <FormLabel htmlFor="jr-profile-edit-display-name">
          Display name
        </FormLabel>
        <FormControl
          id="jr-profile-edit-display-name"
          type="text"
          value={displayName}
          disabled={shouldDisableForm}
          onChange={handleDisplayNameFieldChange}
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
          value={phoneNumber}
          disabled={shouldDisableForm}
          onChange={handlePhoneNumberFieldChange}
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
          value={dingwordsFlat}
          disabled={shouldDisableForm}
          onChange={handleDingwordsChange}
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
          checked={muteApplause}
          onChange={onDisableApplauseChange}
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
          onClick={handleSaveForm}
        >
          Save
        </Button>
      </FormGroup>

      <AudioConfig />
    </div>
  );
};

export default OwnProfilePage;
