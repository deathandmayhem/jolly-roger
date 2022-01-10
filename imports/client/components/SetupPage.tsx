import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { _ } from 'meteor/underscore';
import React, { ReactChild, useCallback, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import styled from 'styled-components';
import Flags from '../../flags';
import isAdmin from '../../lib/is-admin';
import DiscordCache from '../../lib/models/discord_cache';
import Settings from '../../lib/models/settings';
import { SavedDiscordObjectType } from '../../lib/schemas/hunt';
import { SettingType } from '../../lib/schemas/setting';
import { DiscordGuildType } from '../discord';
import { useBreadcrumb } from '../hooks/breadcrumb';
import lookupUrl from '../lookupUrl';

/* eslint-disable max-len, react/jsx-one-expression-per-line */

const Section = styled.section`
  margin-bottom: 24px;
`;

const SectionHeader = styled.h1`
  background-color: #f0f0f0;
  font-size: 18px;
  border-bottom: 1px solid black;
  margin-bottom: 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
`;

const SectionHeaderLabel = styled.span`
  flex: 1 1 auto;
`;

const SectionHeaderButtons = styled.span`
  flex: 0 0 auto;
  button {
    margin-left: 8px;
    margin-bottom: 8px;
  }
`;

const Subsection = styled.div`
  &:not(:last-child) {
    border-bottom: 1px solid #ccc;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }
`;

const SubsectionHeader = styled.h2`
  font-size: 16px;
  font-weight: bold;
  //background-color: #f0f0f0
`;

enum SubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  ERROR = 'error',
}

const googleCompletenessStrings = [
  'Unconfigured',
  '1/3 complete',
  '2/3 complete',
  'Configured',
];

interface GoogleOAuthFormProps {
  isConfigured: boolean;
  initialClientId?: string;
}

type GoogleOAuthFormSubmitState = ({
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS
} | {
  submitState: SubmitState.ERROR;
  submitError: string;
});

const GoogleOAuthForm = (props: GoogleOAuthFormProps) => {
  const [state, setState] = useState<GoogleOAuthFormSubmitState>({
    submitState: SubmitState.IDLE,
  });
  const [clientId, setClientId] = useState<string>(props.initialClientId || '');
  const [clientSecret, setClientSecret] = useState<string>('');

  const dismissAlert = useCallback(() => {
    setState({
      submitState: SubmitState.IDLE,
    });
  }, []);

  const onSubmitOauthConfiguration = useCallback((e: React.FormEvent<any>) => {
    e.preventDefault();

    const trimmedClientId = clientId.trim();
    const trimmedClientSecret = clientSecret.trim();

    if (trimmedClientId.length > 0 && trimmedClientSecret.length === 0) {
      setState({
        submitState: SubmitState.ERROR,
        submitError: 'You appear to be clearing the secret but not the client ID.  Please provide a secret.',
      });
    } else {
      setState({
        submitState: SubmitState.SUBMITTING,
      });
      Meteor.call('setupGoogleOAuthClient', trimmedClientId, trimmedClientSecret, (err?: Error) => {
        if (err) {
          setState({
            submitState: SubmitState.ERROR,
            submitError: err.message,
          });
        } else {
          setState({
            submitState: SubmitState.SUCCESS,
          });
        }
      });
    }
  }, [clientId, clientSecret]);

  const onClientIdChange: FormControlProps['onChange'] = useCallback((e) => {
    setClientId(e.currentTarget.value);
  }, []);

  const onClientSecretChange: FormControlProps['onChange'] = useCallback((e) => {
    setClientSecret(e.currentTarget.value);
  }, []);

  const shouldDisableForm = state.submitState === SubmitState.SUBMITTING;
  const secretPlaceholder = props.isConfigured ? '<configured secret not revealed>' : '';
  return (
    <form onSubmit={onSubmitOauthConfiguration}>
      {state.submitState === SubmitState.SUBMITTING ? <Alert variant="info">Saving...</Alert> : null}
      {state.submitState === SubmitState.ERROR ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {state.submitState === SubmitState.ERROR ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {state.submitError}
        </Alert>
      ) : null}
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-google-client-id">
          Client ID
        </FormLabel>
        <FormControl
          id="jr-setup-edit-google-client-id"
          type="text"
          value={clientId}
          disabled={shouldDisableForm}
          onChange={onClientIdChange}
        />
      </FormGroup>
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-google-client-secret">
          Client secret
        </FormLabel>
        <FormControl
          id="jr-setup-edit-google-client-secret"
          type="text"
          value={clientSecret}
          disabled={shouldDisableForm}
          onChange={onClientSecretChange}
          placeholder={secretPlaceholder}
        />
      </FormGroup>
      <Button variant="primary" type="submit" disabled={shouldDisableForm} onSubmit={onSubmitOauthConfiguration}>
        Save
      </Button>
    </form>
  );
};

type GoogleAuthorizeDriveClientFormState = {
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS;
} | {
  submitState: SubmitState.ERROR;
  error: Error;
}

const GoogleAuthorizeDriveClientForm = () => {
  const [state, setState] = useState<GoogleAuthorizeDriveClientFormState>({
    submitState: SubmitState.IDLE,
  });

  const dismissAlert = useCallback(() => {
    setState({ submitState: SubmitState.IDLE });
  }, []);

  const requestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    setState({ submitState: SubmitState.SUBMITTING });
    Meteor.call('setupGdriveCreds', token, secret, (error?: Error) => {
      if (error) {
        setState({ submitState: SubmitState.ERROR, error });
      } else {
        setState({ submitState: SubmitState.SUCCESS });
      }
    });
  }, []);

  const showPopup = useCallback(() => {
    Google.requestCredential({
      requestPermissions: ['email', 'https://www.googleapis.com/auth/drive'],
      requestOfflineToken: true,
    }, requestComplete);
    return false;
  }, [requestComplete]);

  return (
    <div>
      {state.submitState === SubmitState.SUBMITTING ? <Alert variant="info">Saving...</Alert> : null}
      {state.submitState === SubmitState.SUCCESS ? <Alert variant="success" onClose={dismissAlert}>Saved changes.</Alert> : null}
      {state.submitState === SubmitState.ERROR ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {state.error.message}
        </Alert>
      ) : null}
      <Button variant="primary" onClick={showPopup}>Link a Google account</Button>
      for Google Drive management. (This will replace any previously configured account)
    </div>
  );
};

interface GoogleDriveTemplateFormProps {
  initialDocTemplate?: string;
  initialSpreadsheetTemplate?: string;
}

type GoogleDriveTemplateFormState = ({
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS;
} | {
  submitState: SubmitState.ERROR;
  error: Error;
})

const GoogleDriveTemplateForm = (props: GoogleDriveTemplateFormProps) => {
  const [state, setState] = useState<GoogleDriveTemplateFormState>({
    submitState: SubmitState.IDLE,
  });
  const [docTemplate, setDocTemplate] = useState<string>(props.initialDocTemplate || '');
  const [spreadsheetTemplate, setSpreadsheetTemplate] = useState<string>(props.initialSpreadsheetTemplate || '');

  const dismissAlert = useCallback(() => {
    setState({ submitState: SubmitState.IDLE });
  }, []);

  const onSpreadsheetTemplateChange: FormControlProps['onChange'] = useCallback((e) => {
    setSpreadsheetTemplate(e.currentTarget.value);
  }, []);

  const onDocTemplateChange: FormControlProps['onChange'] = useCallback((e) => {
    setDocTemplate(e.currentTarget.value);
  }, []);

  const saveTemplates = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const ssTemplate = spreadsheetTemplate.trim();
    const ssId = ssTemplate.length > 0 ? ssTemplate : undefined;
    const docTemplateString = docTemplate.trim();
    const docId = docTemplateString.length > 0 ? docTemplateString : undefined;
    setState({
      submitState: SubmitState.SUBMITTING,
    });
    Meteor.call('setupGdriveTemplates', ssId, docId, (error?: Error) => {
      if (error) {
        setState({ submitState: SubmitState.ERROR, error });
      } else {
        setState({ submitState: SubmitState.SUCCESS });
      }
    });
  }, [spreadsheetTemplate, docTemplate]);

  const shouldDisableForm = state.submitState === 'submitting';
  return (
    <div>
      {state.submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
      {state.submitState === 'success' ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {state.submitState === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {state.error.message}
        </Alert>
      ) : null}
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-gdrive-sheet-template">
          Spreadsheet template doc id
        </FormLabel>
        <FormControl
          id="jr-setup-edit-gdrive-sheet-template"
          type="text"
          value={spreadsheetTemplate}
          disabled={shouldDisableForm}
          onChange={onSpreadsheetTemplateChange}
        />
      </FormGroup>
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-gdrive-doc-template">
          Document template doc id
        </FormLabel>
        <FormControl
          id="jr-setup-edit-gdrive-doc-template"
          type="text"
          value={docTemplate}
          disabled={shouldDisableForm}
          onChange={onDocTemplateChange}
        />
      </FormGroup>
      <Button variant="primary" onClick={saveTemplates} disabled={shouldDisableForm}>Save</Button>
    </div>
  );
};

const GoogleIntegrationSection = () => {
  const enabled = useTracker(() => !Flags.active('disable.google'), []);
  const oauthSettings = useTracker(() => ServiceConfiguration.configurations.findOne({ service: 'google' }) as any, []);
  const { gdriveCredential, docTemplate, spreadsheetTemplate } = useTracker(() => {
    const docTemplateSetting = Settings.findOne({ name: 'gdrive.template.document' }) as SettingType & { name: 'gdrive.template.document' } | undefined;
    const spreadsheetTemplateSetting = Settings.findOne({ name: 'gdrive.template.spreadsheet' }) as SettingType & { name: 'gdrive.template.spreadsheet' } | undefined;
    const gdriveSetting = Settings.findOne({ name: 'gdrive.credential' }) as SettingType & { name: 'gdrive.credential' } | undefined;
    return {
      gdriveCredential: gdriveSetting,
      docTemplate: docTemplateSetting?.value.id,
      spreadsheetTemplate: spreadsheetTemplateSetting?.value.id,
    };
  }, []);

  const onToggleEnabled = useCallback(() => {
    const newValue = !enabled;
    const ffValue = newValue ? 'off' : 'on';
    Meteor.call('setFeatureFlag', 'disable.google', ffValue);
  }, [enabled]);

  const disconnectGdrive = useCallback(() => {
    Meteor.call('clearGdriveCreds');
  }, []);

  const firstButtonLabel = enabled ? 'Enabled' : 'Enable';
  const secondButtonLabel = enabled ? 'Disable' : 'Disabled';
  const clientId = (oauthSettings && oauthSettings.clientId) || '';

  let stepsDone = 0;
  if (oauthSettings) {
    stepsDone += 1;
  }
  if (gdriveCredential) {
    stepsDone += 1;
  }
  if (spreadsheetTemplate) {
    stepsDone += 1;
  }

  const comp = googleCompletenessStrings[stepsDone];
  const compBadgeVariant = stepsDone === 3 ? 'success' : 'warning';
  const oauthBadgeLabel = oauthSettings ? 'configured' : 'unconfigured';
  const oauthBadgeVariant = oauthSettings ? 'success' : 'warning';
  const driveBadgeLabel = gdriveCredential ? 'configured' : 'unconfigured';
  const driveBadgeVariant = gdriveCredential ? 'success' : 'warning';
  const maybeDriveUserEmail = gdriveCredential && gdriveCredential.value && gdriveCredential.value.email;
  const templateBadgeLabel = spreadsheetTemplate ? 'configured' : 'unconfigured';
  const templateBadgeVariant = spreadsheetTemplate ? 'success' : 'warning';

  return (
    <Section id="google">
      <SectionHeader>
        <SectionHeaderLabel>
          Google integration
        </SectionHeaderLabel>
        <Badge variant={compBadgeVariant}>
          {comp}
        </Badge>
        <SectionHeaderButtons>
          <Button variant="light" disabled={enabled} onClick={onToggleEnabled}>
            {firstButtonLabel}
          </Button>
          <Button variant="light" disabled={!enabled} onClick={onToggleEnabled}>
            {secondButtonLabel}
          </Button>
        </SectionHeaderButtons>
      </SectionHeader>
      <p>
        There are three pieces to Jolly Roger&apos;s Google integration capabilities:
      </p>
      <ol>
        <li>
          The OAuth client, which allows Jolly Roger to have users link
          their Google account to their Jolly Roger account.
        </li>
        <li>
          Google Drive automation, which automatically creates and shares
          spreadsheets and documents with users when they try to load that
          puzzle page in Jolly Roger.
        </li>
        <li>
          Template documents, which allow customizing the spreadsheet or
          doc to be used as a template when new puzzles are created.  This is
          particularly useful for making all cells use a monospace font by
          default.
        </li>
      </ol>

      <Subsection>
        <SubsectionHeader>
          <span>OAuth client</span>
          {' '}
          <Badge variant={oauthBadgeVariant}>{oauthBadgeLabel}</Badge>
        </SubsectionHeader>
        <p>
          Integrating with Google requires registering an app ID which
          identifies your Jolly Roger instance, and obtaining an app secret
          which proves to Google that you are the operator of this app.
        </p>
        <ul>
          <li>
            Follow <a href="https://support.google.com/googleapi/answer/6158849" target="_blank" rel="noopener noreferrer">Google&apos;s instructions</a> on how to create an app and register an OAuth 2.0 client.
            You can ignore the bit about &quot;Service accounts, web applications, and installed applications&quot;.
          </li>
          <li>Set <strong>Authorized JavaScript origins</strong> to <span>{Meteor.absoluteUrl('')}</span></li>
          <li>Set <strong>Authorized redirect URI</strong> to <span>{Meteor.absoluteUrl('/_oauth/google')}</span></li>
        </ul>
        <p>
          Then, copy the client ID and secret into the fields here and click the Save button.
        </p>
        <GoogleOAuthForm initialClientId={clientId} isConfigured={!!oauthSettings} />
      </Subsection>

      <Subsection>
        <SubsectionHeader>
          <span>Drive user</span>
          {' '}
          <Badge variant={driveBadgeVariant}>{driveBadgeLabel}</Badge>
        </SubsectionHeader>
        <p>
          Jolly Roger automates the creation of Google spreadsheets and
          documents for each puzzle, as well as sharing them with any viewer who
          has linked their Google account to their profile.
          To do so, Jolly Roger needs to be authenticated as some Google
          Drive user which will create and own each spreadsheet and document.
          In production, Death and Mayhem use a separate Google account not
          associated with any particular hunter for this purpose, and we
          recommend this setup.
        </p>
        {maybeDriveUserEmail && (
          <p>
            Currently connected as <strong>{maybeDriveUserEmail}</strong>. <Button onClick={disconnectGdrive}>Disconnect</Button>
          </p>
        )}
        <GoogleAuthorizeDriveClientForm />
      </Subsection>

      <Subsection>
        <SubsectionHeader>
          <span>Document templates</span>
          {' '}
          <Badge variant={templateBadgeVariant}>{templateBadgeLabel}</Badge>
        </SubsectionHeader>
        <p>
          Jolly Roger can create new documents for each puzzle it&apos; made aware of,
          but teams often would prefer that it make a new copy of some template document
          or spreadsheet.  For instance, you might use this to set the default typeface
          to be a monospace font, or to embed your team&apos;s set of Sheets macros, or
          whatever other script you may wish to integrate.
        </p>
        <ul>
          <li>If you wish to use templates, enter the document id (the part of a docs/sheets link after &quot;https://docs.google.com/document/d/&quot; and before &quot;/edit&quot;) for the appropriate template below and press Save.</li>
          <li>To disable templates, replace the template ID with an empty string and press Save.</li>
          <li>Template documents must be accessible by the Drive user connected above.</li>
        </ul>
        <GoogleDriveTemplateForm
          initialSpreadsheetTemplate={spreadsheetTemplate}
          initialDocTemplate={docTemplate}
        />
      </Subsection>
    </Section>
  );
};

interface EmailConfigFormProps {
  initialConfig?: SettingType & { name: 'email.branding' };
}

const EmailConfigForm = (props: EmailConfigFormProps) => {
  const initialConfig = props.initialConfig;
  const [from, setFrom] = useState<string>(initialConfig?.value.from || '');
  const [enrollAccountSubject, setEnrollAccountSubject] =
    useState<string>(initialConfig?.value.enrollAccountMessageSubjectTemplate || '');
  const [enrollAccountMessage, setEnrollAccountMessage] =
    useState<string>(initialConfig?.value.enrollAccountMessageTemplate || '');
  const [existingJoinSubject, setExistingJoinSubject] =
    useState<string>(initialConfig?.value.existingJoinMessageSubjectTemplate || '');
  const [existingJoinMessage, setExistingJoinMessage] =
    useState<string>(initialConfig?.value.existingJoinMessageTemplate || '');
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');

  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onFromChange: FormControlProps['onChange'] = useCallback((e) => {
    setFrom(e.currentTarget.value);
  }, []);

  const onEnrollSubjectChange: FormControlProps['onChange'] = useCallback((e) => {
    setEnrollAccountSubject(e.currentTarget.value);
  }, []);

  const onEnrollMessageChange: FormControlProps['onChange'] = useCallback((e) => {
    setEnrollAccountMessage(e.currentTarget.value);
  }, []);

  const onJoinSubjectChange: FormControlProps['onChange'] = useCallback((e) => {
    setExistingJoinSubject(e.currentTarget.value);
  }, []);

  const onJoinMessageChange: FormControlProps['onChange'] = useCallback((e) => {
    setExistingJoinMessage(e.currentTarget.value);
  }, []);

  const saveConfig = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const trimmedFrom = from.trim();
    const trimmedEnrollAccountMessageSubject = enrollAccountSubject.trim();
    const trimmedEnrollAccountMessage = enrollAccountMessage.trim();
    const trimmedExistingJoinMessageSubject = existingJoinSubject.trim();
    const trimmedExistingJoinMessage = existingJoinMessage.trim();
    setSubmitState(SubmitState.SUBMITTING);
    Meteor.call(
      'setupEmailBranding',
      trimmedFrom,
      trimmedEnrollAccountMessageSubject,
      trimmedEnrollAccountMessage,
      trimmedExistingJoinMessageSubject,
      trimmedExistingJoinMessage,
      (error?: Error) => {
        if (error) {
          setSubmitError(error.message);
          setSubmitState(SubmitState.ERROR);
        } else {
          setSubmitState(SubmitState.SUCCESS);
        }
      }
    );
  }, [from, enrollAccountSubject, enrollAccountMessage, existingJoinSubject, existingJoinMessage]);

  const shouldDisableForm = submitState === 'submitting';
  return (
    <div>
      {submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
      {submitState === 'success' ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {submitState === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {submitError}
        </Alert>
      ) : null}
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-email-from">
          Email &quot;From&quot; address
        </FormLabel>
        <FormControl
          id="jr-setup-edit-email-from"
          aria-describedby="jr-setup-edit-email-from-description"
          type="text"
          value={from}
          disabled={shouldDisableForm}
          onChange={onFromChange}
        />
        <FormText id="jr-setup-edit-email-from-description">
          The credentials you configured for <code>MAIL_URL</code> must be
          able to send email as this address.
        </FormText>
      </FormGroup>
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-email-enroll-subject">
          New user invite email subject
        </FormLabel>
        <FormControl
          id="jr-setup-edit-email-enroll-subject"
          aria-describedby="jr-setup-edit-email-enroll-subject-description"
          type="text"
          value={enrollAccountSubject}
          disabled={shouldDisableForm}
          onChange={onEnrollSubjectChange}
        />
        <FormText id="jr-setup-edit-email-enroll-subject-description" muted>
          This is a Mustache template.  The only variable available is:
          {' '}
          <code>
            {'{{siteName}}'}
          </code>
          {' (domain name).'}
        </FormText>
      </FormGroup>
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-email-enroll-message">
          New user invite email contents
        </FormLabel>
        <FormControl
          id="jr-setup-edit-email-enroll-message"
          aria-describedby="jr-setup-edit-email-enroll-message-description"
          as="textarea"
          rows={8}
          value={enrollAccountMessage}
          disabled={shouldDisableForm}
          onChange={onEnrollMessageChange}
        />
        <FormText id="jr-setup-edit-email-enroll-message-description" muted>
          This is a Mustache template.  Available variables are:
          <ul>
            <li>
              <code>
                {'{{&url}}'}
              </code>
              {' '}
              (user&apos;s invite link, the ampersand is required to avoid
              HTML escaping which will break the link)
            </li>
            <li>
              <code>
                {'{{email}}'}
              </code>
              {' '}
              (user&apos;s email address, so they can know what email address
              to use as their username in the future)
            </li>
            <li>
              <code>
                {'{{siteName}}'}
              </code>
              {' '}
              (domain name of this site)
            </li>
            <li>
              <code>
                {'{{huntNamesCommaSeparated}}'}
              </code>
              {' '}
              (a string containing a comma-separated list of the hunts the
              user is being invited to)
            </li>
            <li>
              <code>
                {'{{#huntNamesCount}}'}
              </code>
              /
              <code>
                {'{{/huntNamesCount}}'}
              </code>
              {' '}
              (start/end of conditional block that will only be rendered if
              the user is being invited to at least one hunt)
            </li>
            <li>
              <code>
                {'{{mailingListsCommaSeparated}}'}
              </code>
              {' '}
              (a string containing a comma-separated list of the mailing
              lists the user has been added to)
            </li>
            <li>
              <code>
                {'{{#mailingListsCount}}'}
              </code>
              /
              <code>
                {'{{/mailingListsCount}}'}
              </code>
              {' '}
              (start/end of conditional block that will only be rendered if
              the user is being added to at least one mailing list)
            </li>
          </ul>
        </FormText>
      </FormGroup>
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-email-existing-join-subject">
          Existing user added-to-hunt email subject
        </FormLabel>
        <FormControl
          id="jr-setup-edit-email-existing-join-subject"
          aria-describedby="jr-setup-edit-email-existing-join-subject-description"
          type="text"
          value={existingJoinSubject}
          disabled={shouldDisableForm}
          onChange={onJoinSubjectChange}
        />
        <FormText id="jr-setup-edit-email-existing-join-subject-description" muted>
          This is a Mustache template.  The following variables are available:
          <ul>
            <li>
              <code>
                {'{{siteName}}'}
              </code>
              {' '}
              (domain name of this site)
            </li>
            <li>
              <code>
                {'{{huntName}}'}
              </code>
              {' '}
              (name of the hunt the user is being invited to)
            </li>
          </ul>
        </FormText>
      </FormGroup>
      <FormGroup>
        <FormLabel htmlFor="jr-setup-edit-email-existing-join-message">
          Existing user added-to-hunt email contents
        </FormLabel>
        <FormControl
          id="jr-setup-edit-email-existing-join-message"
          aria-describedby="jr-setup-edit-email-existing-join-message-description"
          as="textarea"
          rows={8}
          value={existingJoinMessage}
          disabled={shouldDisableForm}
          onChange={onJoinMessageChange}
        />
        <FormText id="jr-setup-edit-email-existing-join-message-description" muted>
          This is a Mustache template.  Available variables are:
          <ul>
            <li>
              <code>
                {'{{email}}'}
              </code>
              {' '}
              (user&apos;s email address, so they can know what email address
              of the dozen that the user might have that forward to the same
              inbox this message was sent to)
            </li>
            <li>
              <code>
                {'{{huntName}}'}
              </code>
              {' '}
              (name of the hunt the recipient is being added to)
            </li>
            <li>
              <code>
                {'{{siteName}}'}
              </code>
              {' '}
              (domain name of this site)
            </li>
            <li>
              <code>
                {'{{joinerName}}'}
              </code>
              {' '}
              (if available, the display name of the user who invited the recipient of the email to the hunt in question)
            </li>
            <li>
              <code>
                {'{{mailingListsCommaSeparated}}'}
              </code>
              {' '}
              (a string containing a comma-separated list of the mailing
              lists the user has been added to)
            </li>
            <li>
              <code>
                {'{{#mailingListsCount}}'}
              </code>
              /
              <code>
                {'{{/mailingListsCount}}'}
              </code>
              {' '}
              (start/end of conditional block that will only be rendered if
              the user is being added to at least one mailing list)
            </li>
          </ul>
        </FormText>
      </FormGroup>
      <Button variant="primary" onClick={saveConfig} disabled={shouldDisableForm}>Save</Button>
    </div>
  );
};

const EmailConfigSection = () => {
  const config = useTracker(() => {
    return Settings.findOne({ name: 'email.branding' }) as SettingType & { name: 'email.branding' } | undefined;
  }, []);
  const configured = !!(config?.value.from);
  const badgeVariant = configured ? 'success' : 'warning';
  return (
    <Section id="email">
      <SectionHeader>
        <SectionHeaderLabel>
          Email configuration
        </SectionHeaderLabel>
        <Badge variant={badgeVariant}>
          {configured ? 'Configured' : 'Unconfigured'}
        </Badge>
      </SectionHeader>
      <p>
        Jolly Roger sends email for a few reasons:
      </p>
      <ul>
        <li>When a user is first invited to Jolly Roger</li>
        <li>When an existing user is added to a particular Hunt</li>
        <li>When a user initiates a password reset</li>
      </ul>
      <p>
        This section allows setting the &quot;From&quot; address, as well as
        providing subject and content templates for the enrollment and
        existing-user-hunt-added emails.
      </p>
      <p>
        Most of these fields are interpreted as Mustache templates.  See
        {' '}
        <a target="_blank" rel="noopener noreferrer" href="https://github.com/janl/mustache.js">
          the mustache.js docs
        </a>
        {' '}
        for an overview of the supported syntax.  The <code>view</code>
        variables available to each context are described below.
      </p>
      <EmailConfigForm initialConfig={config} />
    </Section>
  );
};

interface DiscordOAuthFormProps {
  oauthSettings: any;
}

const DiscordOAuthForm = (props: DiscordOAuthFormProps) => {
  const [clientId, setClientId] =
    useState<string>((props.oauthSettings && props.oauthSettings.appId) || '');
  const [clientSecret, setClientSecret] =
    useState<string>((props.oauthSettings && props.oauthSettings.secret) || '');
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');

  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onClientIdChange: FormControlProps['onChange'] = useCallback((e) => {
    setClientId(e.currentTarget.value);
  }, []);

  const onClientSecretChange: FormControlProps['onChange'] = useCallback((e) => {
    setClientSecret(e.currentTarget.value);
  }, []);

  const onSubmitOauthConfiguration = useCallback((e: React.FormEvent<any>) => {
    e.preventDefault();

    const trimmedClientId = clientId.trim();
    const trimmedClientSecret = clientSecret.trim();

    if (trimmedClientId.length > 0 && trimmedClientSecret.length === 0) {
      setSubmitError('You appear to be clearing the secret but not the client ID.  Please provide a secret.');
      setSubmitState(SubmitState.ERROR);
    } else {
      setSubmitState(SubmitState.SUBMITTING);
      Meteor.call(
        'setupDiscordOAuthClient',
        trimmedClientId,
        trimmedClientSecret,
        (err?: Error) => {
          if (err) {
            setSubmitError(err.message);
            setSubmitState(SubmitState.ERROR);
          } else {
            setSubmitState(SubmitState.SUCCESS);
          }
        }
      );
    }
  }, [clientId, clientSecret]);

  const shouldDisableForm = submitState === 'submitting';
  const configured = !!props.oauthSettings;
  const secretPlaceholder = configured ? '<configured secret not revealed>' : '';
  return (
    <div>
      {submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
      {submitState === 'success' ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {submitState === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {submitError}
        </Alert>
      ) : null}

      {/* TODO: UI for client ID and client secret */}
      <form onSubmit={onSubmitOauthConfiguration}>
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-discord-client-id">
            Client ID
          </FormLabel>
          <FormControl
            id="jr-setup-edit-discord-client-id"
            type="text"
            placeholder=""
            value={clientId}
            disabled={shouldDisableForm}
            onChange={onClientIdChange}
          />
        </FormGroup>
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-discord-client-secret">
            Client Secret
          </FormLabel>
          <FormControl
            id="jr-setup-edit-discord-client-secret"
            type="text"
            placeholder={secretPlaceholder}
            value={clientSecret}
            disabled={shouldDisableForm}
            onChange={onClientSecretChange}
          />
        </FormGroup>
        <Button variant="primary" type="submit" onClick={onSubmitOauthConfiguration} disabled={shouldDisableForm}>Save</Button>
      </form>
    </div>
  );
};

interface DiscordBotFormProps {
  botToken?: string
}

const DiscordBotForm = (props: DiscordBotFormProps) => {
  const [botToken, setBotToken] = useState<string>(props.botToken || '');
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');

  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onBotTokenChange: FormControlProps['onChange'] = useCallback((e) => {
    setBotToken(e.currentTarget.value);
  }, []);

  const onSubmitBotToken = useCallback((e: React.FormEvent<any>) => {
    e.preventDefault();
    const trimmedBotToken = botToken.trim();

    setSubmitState(SubmitState.SUBMITTING);
    Meteor.call('setupDiscordBotToken', trimmedBotToken, (err?: Error) => {
      if (err) {
        setSubmitError(err.message);
        setSubmitState(SubmitState.ERROR);
      } else {
        setSubmitState(SubmitState.SUCCESS);
      }
    });
  }, [botToken]);

  const shouldDisableForm = submitState === SubmitState.SUBMITTING;
  return (
    <div>
      {submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
      {submitState === 'success' ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {submitState === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {submitError}
        </Alert>
      ) : null}

      <form onSubmit={onSubmitBotToken}>
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-discord-bot-token">
            Bot token
          </FormLabel>
          <FormControl
            id="jr-setup-edit-discord-bot-token"
            type="text"
            placeholder=""
            value={botToken}
            disabled={shouldDisableForm}
            onChange={onBotTokenChange}
          />
        </FormGroup>
        <Button variant="primary" type="submit" onClick={onSubmitBotToken} disabled={shouldDisableForm}>Save</Button>
      </form>
    </div>
  );
};

interface DiscordGuildFormProps {
  // initial value from settings
  guild?: DiscordGuildType;
}

const DiscordGuildForm = (props: DiscordGuildFormProps) => {
  useSubscribe('discord.guilds');
  const guilds = useTracker(() => {
    return DiscordCache.find({ type: 'guild' }, { fields: { 'object.id': 1, 'object.name': 1 } })
      .map((c) => c.object as SavedDiscordObjectType);
  }, []);
  const [guildId, setGuildId] = useState<string>((props.guild && props.guild.id) || '');
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');

  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onSelectedGuildChange: FormControlProps['onChange'] = useCallback((e) => {
    const newValue = e.currentTarget.value === 'empty' ? '' : e.currentTarget.value;
    setGuildId(newValue);
  }, []);

  const onSaveGuild = useCallback((e: React.FormEvent<any>) => {
    e.preventDefault();

    const guild = guilds.find((g) => g.id === guildId);
    setSubmitState(SubmitState.SUBMITTING);
    Meteor.call('setupDiscordBotGuild', guild, (err?: Error) => {
      if (err) {
        setSubmitError(err.message);
        setSubmitState(SubmitState.ERROR);
      } else {
        setSubmitState(SubmitState.SUCCESS);
      }
    });
  }, [guilds, guildId]);

  const shouldDisableForm = submitState === SubmitState.SUBMITTING;
  const noneOption = {
    id: 'empty',
    name: 'No guild assigned',
  };
  const formOptions = [noneOption, ...guilds];
  return (
    <div>
      {submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
      {submitState === 'success' ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {submitState === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {submitError}
        </Alert>
      ) : null}

      <form onSubmit={onSaveGuild}>
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-discord-bot-guild">
            Guild
          </FormLabel>
          <FormControl
            id="jr-setup-edit-discord-bot-guild"
            as="select"
            type="text"
            placeholder=""
            value={guildId}
            disabled={shouldDisableForm}
            onChange={onSelectedGuildChange}
          >
            {formOptions.map(({ id, name }) => {
              return (
                <option key={id} value={id}>{name}</option>
              );
            })}
          </FormControl>
        </FormGroup>
        <Button variant="primary" type="submit" onClick={onSaveGuild} disabled={shouldDisableForm}>Save</Button>
      </form>
    </div>
  );
};

const DiscordIntegrationSection = () => {
  const enabled = useTracker(() => !Flags.active('disable.discord'), []);
  const oauthSettings = useTracker(() => ServiceConfiguration.configurations.findOne({ service: 'discord' }), []);
  const { botToken, guild } = useTracker(() => {
    const botSetting = Settings.findOne({ name: 'discord.bot' }) as SettingType & { name: 'discord.bot' } | undefined;
    const guildSetting = Settings.findOne({ name: 'discord.guild' }) as SettingType & { name: 'discord.guild' } | undefined;
    return {
      botToken: botSetting?.value.token,
      guild: guildSetting?.value.guild,
    };
  }, []);

  const onToggleEnabled = useCallback(() => {
    const newValue = !enabled;
    const ffValue = newValue ? 'off' : 'on';
    Meteor.call('setFeatureFlag', 'disable.discord', ffValue);
  }, [enabled]);

  const firstButtonLabel = enabled ? 'Enabled' : 'Enable';
  const secondButtonLabel = enabled ? 'Disable' : 'Disabled';

  const configured = !!oauthSettings;
  const headerBadgeVariant = configured ? 'success' : 'warning';
  const clientId = oauthSettings && oauthSettings.appId;
  const addGuildLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=8`;
  const oauthBadgeLabel = oauthSettings ? 'configured' : 'unconfigured';
  const oauthBadgeVariant = oauthSettings ? 'success' : 'warning';
  const botBadgeLabel = botToken ? 'configured' : 'unconfigured';
  const botBadgeVariant = botToken ? 'success' : 'warning';
  const guildBadgeLabel = guild ? 'configured' : 'unconfigured';
  const guildBadgeVariant = guild ? 'success' : 'warning';
  return (
    <Section id="discord">
      <SectionHeader>
        <SectionHeaderLabel>
          Discord integration
        </SectionHeaderLabel>
        <Badge variant={headerBadgeVariant}>
          {configured ? 'Configured' : 'Unconfigured'}
        </Badge>
        {configured && (
        <SectionHeaderButtons>
          <Button variant="light" disabled={enabled} onClick={onToggleEnabled}>
            {firstButtonLabel}
          </Button>
          <Button variant="light" disabled={!enabled} onClick={onToggleEnabled}>
            {secondButtonLabel}
          </Button>
        </SectionHeaderButtons>
        )}
      </SectionHeader>

      <p>
        Jolly Roger supports a Discord integration, where this instance
        connects to Discord as a bot user with several useful capabilities.
      </p>
      <ul>
        <li>It can invite users to a guild (&quot;server&quot;) that it is a member of</li>
        <li>It can send messages to a channel on new puzzle creation, or when a puzzle is solved</li>
        <li>It can send messages to a channel when a new announcement is created</li>
        <li>It can send messages to a channel when users write chat messages on puzzle pages</li>
      </ul>
      <p>
        There are multiple pieces to Jolly Roger&apos;s Discord integration capabilities:
      </p>
      <ol>
        <li>
          The OAuth client, which allows Jolly Roger to have users link
          their Discord account to their Jolly Roger account.  This enables
          Jolly Roger to correlate chat messages sent on Discord with user
          accounts within Jolly Roger.
        </li>
        <li>
          The bot account, which allows Jolly Roger to programmatically
          manage guild (&quot;server&quot;) invitations to members.
        </li>
        <li>
          Guild selection, since Discord bots can be part of multiple guilds.
        </li>
      </ol>

      <Subsection>
        <SubsectionHeader>
          <span>OAuth client</span>
          {' '}
          <Badge variant={oauthBadgeVariant}>{oauthBadgeLabel}</Badge>
        </SubsectionHeader>
        <p>
          Jolly Roger can allow Discord users to grant limited access to
          their Discord account for the purposes of adding them to a guild
          and linking their chat messages between the two services.
        </p>
        <p>
          To enable Discord OAuth integration, you will need to:
        </p>
        <ol>
          <li>Create a new Discord application at <a href="https://discord.com/developers/applications">https://discord.com/developers/applications</a></li>
          <li>In the OAuth2 section, add a redirect pointing to <span>{Meteor.absoluteUrl('/_oauth/discord')}</span></li>
          <li>In the Bot section, create a bot account.</li>
          <li>Copy the Client ID and Client Secret from the &quot;General Information&quot; section and paste them here below.</li>
          <li>Copy the Token from the Bot section and paste it below.</li>
          <li>Click the save button below.</li>
          <li>Then, after you have successfully saved the client secret and bot token: as the guild (&quot;server&quot;) owner, <a href={addGuildLink}>add the bot to your Discord guild here</a>.</li>
        </ol>
        <DiscordOAuthForm oauthSettings={oauthSettings} />
      </Subsection>

      <Subsection>
        <SubsectionHeader>
          <span>Bot account</span>
          {' '}
          <Badge variant={botBadgeVariant}>{botBadgeLabel}</Badge>
        </SubsectionHeader>
        <p>
          Since Discord only allows guild invitations to be managed by bot
          accounts, to use Jolly Roger to automate Discord guild membership,
          you must create a bot account, save its token here, and then add
          it to the guild for which you wish to automate invites.
        </p>
        <DiscordBotForm
          botToken={botToken}
        />
      </Subsection>

      <Subsection>
        <SubsectionHeader>
          <span>Guild</span>
          {' '}
          <Badge variant={guildBadgeVariant}>{guildBadgeLabel}</Badge>
        </SubsectionHeader>
        <p>
          Since bots can be part of multiple guilds, you&apos;ll need to specify
          which one you want Jolly Roger to add users to.  Note that Discord
          bots can only add other users to guilds which they are already a
          member of, so if you see no guilds selectable here, you may need
          to first <a href={addGuildLink}>add the bot to your guild</a>.
        </p>

        <DiscordGuildForm
          guild={guild}
        />
      </Subsection>
    </Section>
  );
};

const BrandingTeamName = () => {
  const initialTeamName = useTracker(() => {
    const teamNameSetting = Settings.findOne({ name: 'teamname' }) as SettingType & { name: 'teamname' } | undefined;
    return teamNameSetting?.value.teamName;
  }, []);

  const [teamName, setTeamName] = useState<string>(initialTeamName || '');
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');

  const onTeamNameChange: FormControlProps['onChange'] = useCallback((e) => {
    setTeamName(e.currentTarget.value);
  }, []);

  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onSubmit = useCallback((e: React.FormEvent<any>) => {
    e.preventDefault();
    setSubmitState(SubmitState.SUBMITTING);
    Meteor.call('setupSetTeamName', teamName, (err?: Error) => {
      if (err) {
        setSubmitError(err.message);
        setSubmitState(SubmitState.ERROR);
      } else {
        setSubmitState(SubmitState.SUCCESS);
      }
    });
  }, [teamName]);

  const shouldDisableForm = submitState === SubmitState.SUBMITTING;
  return (
    <div>
      {submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
      {submitState === 'success' ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {submitState === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {submitError}
        </Alert>
      ) : null}

      <form onSubmit={onSubmit}>
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-team-name">
            Team name
          </FormLabel>
          <FormControl
            id="jr-setup-edit-team-name"
            type="text"
            placeholder=""
            value={teamName}
            disabled={shouldDisableForm}
            onChange={onTeamNameChange}
          />
        </FormGroup>
        <Button variant="primary" type="submit" onClick={onSubmit} disabled={shouldDisableForm}>Save</Button>
      </form>
    </div>
  );
};

interface BrandingAssetRowProps {
  asset: string;
  backgroundSize?: string;
  children?: ReactChild;
}

const BrandingRow = styled.div`
  &:not(:last-child) {
    margin-bottom: 8px;
  }
`;

const BrandingRowContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const BrandingRowImage = styled.div<{ backgroundImage: string, backgroundSize: string }>`
  width: 200px;
  height: 200px;
  background-position: center;
  background-repeat: no-repeat;
  background-image: url(${(props) => props.backgroundImage});
  background-size: ${(props) => props.backgroundSize};
`;

const BrandingAssetRow = (props: BrandingAssetRowProps) => {
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');

  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const UPLOAD_SIZE_LIMIT = 1024 * 1024; // 1 MiB
      if (file.size > UPLOAD_SIZE_LIMIT) {
        setSubmitError(`${file.name} is too large at ${file.size} bytes (limit is ${UPLOAD_SIZE_LIMIT})`);
        setSubmitState(SubmitState.ERROR);
        return;
      }
      setSubmitState(SubmitState.SUBMITTING);
      Meteor.call('setupGetUploadToken', props.asset, file.type, (err?: Error, uploadToken?: string) => {
        if (err) {
          setSubmitError(err.message);
          setSubmitState(SubmitState.ERROR);
        } else {
          fetch(`/asset/${uploadToken}`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
              'Content-Type': file.type,
            },
            body: file,
          }).then((resp: Response) => {
            if (resp.ok) {
              setSubmitState(SubmitState.SUCCESS);
            } else {
              setSubmitError(`${resp.status} ${resp.statusText}`);
              setSubmitState(SubmitState.ERROR);
            }
          }).catch((error: Error) => {
            setSubmitError(error.message);
            setSubmitState(SubmitState.ERROR);
          });
        }
      });
    }
  }, [props.asset]);

  // If no BlobMapping is present for this asset, fall back to the default one from the public/images folder
  const blobUrl = useTracker(() => lookupUrl(props.asset), [props.asset]);
  return (
    <BrandingRow>
      {submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
      {submitState === 'success' ? <Alert variant="success" dismissible onClose={dismissAlert}>Saved changes.</Alert> : null}
      {submitState === 'error' ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed:
          {' '}
          {submitError}
        </Alert>
      ) : null}
      <BrandingRowContent>
        <BrandingRowImage
          backgroundImage={blobUrl}
          backgroundSize={props.backgroundSize || 'auto'}
        />
        <label htmlFor={`asset-input-${props.asset}`}>
          <div>{props.asset}</div>
          <div>{props.children}</div>
          <input id={`asset-input-${props.asset}`} type="file" onChange={onFileSelected} />
        </label>
      </BrandingRowContent>
    </BrandingRow>
  );
};

const BrandingSection = () => {
  return (
    <Section id="branding">
      <SectionHeader>
        <SectionHeaderLabel>
          Branding
        </SectionHeaderLabel>
      </SectionHeader>
      <Subsection>
        <SubsectionHeader>
          <span>Team name</span>
        </SubsectionHeader>
        <p>
          The team name is displayed:
        </p>
        <ul>
          <li>on the login page</li>
          <li>in the filenames of any Google Docs/Sheets created by Jolly Roger</li>
          <li>and anywhere else we may refer to the team that owns this Jolly Roger instance.</li>
        </ul>
        <BrandingTeamName />
      </Subsection>
      {/* Adding a new branding asset? Make sure to add it to imports/server/lookupUrl.ts as well */}
      <Subsection>
        <SubsectionHeader>
          <span>Essential imagery</span>
        </SubsectionHeader>
        <BrandingAssetRow asset="brand.png">
          Brand icon, 50x50 pixels, shown in the top left of all logged-in pages
        </BrandingAssetRow>
        <BrandingAssetRow asset="brand@2x.png">
          Brand icon @ 2x res for high-DPI displays, 100x100 pixels, shown in
          the top left of all logged-in pages.
        </BrandingAssetRow>
        <BrandingAssetRow asset="hero.png" backgroundSize="contain">
          Hero image, approximately 510x297 pixels, shown on the
          login/enroll/password-reset pages.
        </BrandingAssetRow>
        <BrandingAssetRow asset="hero@2x.png" backgroundSize="contain">
          Hero image @ 2x res for high-DPI displays, approximately 1020x595
          pixels, shown on the login/enroll/password-reset pages.
        </BrandingAssetRow>
      </Subsection>
      <Subsection>
        <SubsectionHeader>
          <span>Favicons and related iconography</span>
        </SubsectionHeader>
        <BrandingAssetRow asset="android-chrome-192x192.png">
          Android Chrome favicon at 192x192 pixels
        </BrandingAssetRow>
        <BrandingAssetRow asset="android-chrome-512x512.png" backgroundSize="contain">
          Android Chrome favicon at 512x512 pixels
        </BrandingAssetRow>
        <BrandingAssetRow asset="apple-touch-icon.png">
          Square Apple touch icon at 180x180 pixels
        </BrandingAssetRow>
        <BrandingAssetRow asset="favicon-16x16.png">
          Favicon as PNG at 16x16 pixels
        </BrandingAssetRow>
        <BrandingAssetRow asset="favicon-32x32.png">
          Favicon as PNG at 32x32 pixels
        </BrandingAssetRow>
        <BrandingAssetRow asset="mstile-150x150.png">
          Tile used by Windows, IE, and Edge, as PNG at 150x150 pixels
        </BrandingAssetRow>
        <BrandingAssetRow asset="safari-pinned-tab.svg" backgroundSize="contain">
          Black-and-transparent SVG used by Safari for pinned tabs
        </BrandingAssetRow>
      </Subsection>
    </Section>
  );
};

interface CircuitBreakerControlProps {
  // What do you call this circuit breaker?
  title: string;

  // What is the database name for this flag
  flagName: string;

  // some explanation of what this feature flag controls and why you might want to toggle it.
  children: React.ReactNode;
}

const CircuitBreaker = styled.div`
  margin-bottom: 16px;
`;

const CircuitBreakerRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
  background: #eee;
`;

const CircuitBreakerLabel = styled.div`
  font-size: 16px;
  flex: 1 1 auto;
`;

const CircuitBreakerButtons = styled.div`
  flex: 0 0 auto;
  button {
    margin-left: 8px;
  }
`;

const CircuitBreakerControl = (props: CircuitBreakerControlProps) => {
  const {
    title, flagName, children,
  } = props;

  // disabled should be false if the circuit breaker is not intentionally disabling the feature,
  // and true if the feature is currently disabled.
  // most features will have false here most of the time.
  const featureDisabled = useTracker(() => Flags.active(flagName), [flagName]);

  const onChangeCb = useCallback(() => {
    const desiredState = !featureDisabled;
    Meteor.call('setFeatureFlag', flagName, desiredState ? 'on' : 'off');
  }, [flagName, featureDisabled]);

  // Is the feature that this circuit breaker disables currently available?
  const featureIsEnabled = !featureDisabled;
  const firstButtonLabel = featureIsEnabled ? 'Enabled' : 'Enable';
  const secondButtonLabel = featureIsEnabled ? 'Disable' : 'Disabled';

  return (
    <CircuitBreaker>
      <CircuitBreakerRow>
        <CircuitBreakerLabel>
          {title}
        </CircuitBreakerLabel>
        <CircuitBreakerButtons>
          <Button variant="light" disabled={featureIsEnabled} onClick={onChangeCb}>
            {firstButtonLabel}
          </Button>
          <Button variant="light" disabled={!featureIsEnabled} onClick={onChangeCb}>
            {secondButtonLabel}
          </Button>
        </CircuitBreakerButtons>
      </CircuitBreakerRow>
      <div className="circuit-breaker-description">
        {children}
      </div>
    </CircuitBreaker>
  );
};

const CircuitBreakerSection = () => {
  return (
    <Section id="circuit-breakers">
      <SectionHeader>
        Circuit breakers
      </SectionHeader>
      <p>
        Jolly Roger has several features which can be responsible for high
        server load or increased latency.  We allow them to be disabled at
        runtime to enable graceful degradation if your deployment is having
        issues.
      </p>
      <CircuitBreakerControl
        title="Drive permission sharing"
        flagName="disable.gdrive_permissions"
      >
        <p>
          When Jolly Roger creates a spreadsheet or document, we grant
          anonymous access to the sheet or doc by link.  This has the unfortunate
          effect of making all viewers appear unidentified, e.g. Anonymous
          Aardvark, since otherwise Google Doc scripting tools could be used to
          harvest information about anyone who opens a link viewers.
        </p>
        <p>
          If, however, the document has already been explicitly shared with a particular google account,
          then that user&apos;s identity will be revealed in the document, which means you can see who it is
          editing or highlighting what cell in the spreadsheet and whatnot.
        </p>
        <p>
          Since sharing documents with N people in a hunt is N API calls, to
          avoid getting rate-limited by Google, we opt to do this sharing lazily
          when hunters open the puzzle page.
        </p>
        <p>
          Disabling this feature means that Jolly Roger will continue to
          create documents, but will not attempt to share them to users that have
          linked their Google identity.  As a result, new documents will show
          entirely anonymous animal users, and users looking at documents for the
          first time will also remain anonymous within the Google iframe.
        </p>
      </CircuitBreakerControl>
      <CircuitBreakerControl
        title="Celebrations"
        flagName="disable.applause"
      >
        <p>
          Some teams like broadcasting when a puzzle is solved, to make
          people aware of the shape of correct answers and to celebrate progress.
          Others do not, prefering to avoid distracting people or creating
          sound, especially since some puzzles involve audio cues.
          While individual users can squelch applause in their
          profile/settings, we also provide this global toggle if your team
          prefers to forgo this celebratory opportunity.
        </p>
        <p>
          Disabling this feature means that Jolly Roger will not show a modal
          and play an applause sound to all open tabs of all members of a
          particular hunt when a puzzle in that hunt is solved.
        </p>
      </CircuitBreakerControl>
      <CircuitBreakerControl
        title="WebRTC calls"
        flagName="disable.webrtc"
      >
        <p>
          Jolly Roger has experimental support for making WebRTC audio calls
          built into each puzzle page.  Jolly Roger provides the signaling
          server and all members of the call establish a direct connection to
          all other members of the same call (which is more complex at the
          edge, but avoids needing to operate a separate high-capacity,
          latency-sensitive reencoding server).  Note that video calls are
          not currently supported primarily due to the bandwidth constraints
          the mesh connectivity would imply -- video consumes 60x the bitrate
          of audio, and we estimate most residential network connections to
          only be able to reliably support around 4 call participants at a
          time before significant degradation.
        </p>
        <p>
          Disabling this feature means that Jolly Roger will not show an
          audiocall section in the UI on the puzzle page, nor will clients
          join calls.  The server will still service WebRTC-related
          subscriptions and methods, but we expect clients to not generate
          such load once the flag is flipped.
        </p>
      </CircuitBreakerControl>
      <CircuitBreakerControl
        title="WebRTC call spectrograms"
        flagName="disable.spectra"
      >
        <p>
          In the WebRTC call UI, we show audio activity via spectrograms.
          However, this is expensive, since it involves doing FFTs and updating
          visualizations every frame, for every client.  We provide a feature
          flag to disable these spectra.
        </p>
        <p>
          Disabling this feature means that Jolly Roger will not show any
          visual indicator of who in a call is talking, but will use less CPU
          and battery for members of WebRTC calls.
        </p>
      </CircuitBreakerControl>
      <CircuitBreakerControl
        title="Dingwords"
        flagName="disable.dingwords"
      >
        <p>
          User-specified &quot;dingwords&quot; allow users to get notified if anyone
          mentions a word of particular significance to the user in any of the puzzle
          chats, so that they can potentially contribute.  However, this involves doing
          substantial matching work for every chat message sent, and the CPU/DB load
          involved have not been tested in production yet.
        </p>
        <p>
          Disabling this feature means that Jolly Roger will no longer do expensive
          work on each chat message sent, and no new dingword notifications will be
          generated or displayed.
        </p>
      </CircuitBreakerControl>
    </Section>
  );
};

const SetupPage = () => {
  useBreadcrumb({ title: 'Server setup', path: '/setup' });

  const loading = useSubscribe('mongo.settings');
  const canConfigure = useTracker(() => isAdmin(Meteor.userId()), []);

  if (loading()) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  if (!canConfigure) {
    return (
      <div>
        <h1>Not authorized</h1>
        <p>This page allows server admins to reconfigure the server, but you&apos;re not an admin.</p>
      </div>
    );
  }

  return (
    <div>
      <GoogleIntegrationSection />
      <EmailConfigSection />
      <DiscordIntegrationSection />
      <BrandingSection />
      <CircuitBreakerSection />
    </div>
  );
};

export default SetupPage;
