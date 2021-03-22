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
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import Flags from '../../flags';
import DiscordCache from '../../lib/models/discord_cache';
import Settings from '../../lib/models/settings';
import { SettingType } from '../../lib/schemas/settings';
import { DiscordGuildType } from '../discord';

/* eslint-disable max-len, react/jsx-one-expression-per-line */

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

type GoogleOAuthFormState = {
  clientId: string;
  clientSecret: string;
} & ({
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS
} | {
  submitState: SubmitState.ERROR;
  submitError: string;
})

class GoogleOAuthForm extends React.Component<GoogleOAuthFormProps, GoogleOAuthFormState> {
  constructor(props: GoogleOAuthFormProps) {
    super(props);
    const clientId = props.initialClientId || '';
    this.state = {
      submitState: SubmitState.IDLE,
      clientId,
      clientSecret: '',
    } as GoogleOAuthFormState;
  }

  dismissAlert = () => {
    this.setState({ submitState: SubmitState.IDLE });
  };

  onSubmitOauthConfiguration = (e: React.FormEvent<any>) => {
    e.preventDefault();

    const clientId = this.state.clientId.trim();
    const clientSecret = this.state.clientSecret.trim();

    if (clientId.length > 0 && clientSecret.length === 0) {
      this.setState({
        submitState: SubmitState.ERROR,
        submitError: 'You appear to be clearing the secret but not the client ID.  Please provide a secret.',
      } as GoogleOAuthFormState);
    } else {
      this.setState({
        submitState: SubmitState.SUBMITTING,
      });
      Meteor.call('setupGoogleOAuthClient', clientId, clientSecret, (err?: Error) => {
        if (err) {
          this.setState({
            submitState: SubmitState.ERROR,
            submitError: err.message,
          } as GoogleOAuthFormState);
        } else {
          this.setState({
            submitState: SubmitState.SUCCESS,
          });
        }
      });
    }
  };

  onClientIdChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      clientId: e.currentTarget.value,
    });
  };

  onClientSecretChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      clientSecret: e.currentTarget.value,
    });
  };

  render() {
    const shouldDisableForm = this.state.submitState === SubmitState.SUBMITTING;
    const secretPlaceholder = this.props.isConfigured ? '<configured secret not revealed>' : '';
    return (
      <form onSubmit={this.onSubmitOauthConfiguration}>
        {this.state.submitState === SubmitState.SUBMITTING ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === SubmitState.ERROR ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === SubmitState.ERROR ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
          </Alert>
        ) : null}
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-google-client-id">
            Client ID
          </FormLabel>
          <FormControl
            id="jr-setup-edit-google-client-id"
            type="text"
            value={this.state.clientId}
            disabled={shouldDisableForm}
            onChange={this.onClientIdChange}
          />
        </FormGroup>
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-google-client-secret">
            Client secret
          </FormLabel>
          <FormControl
            id="jr-setup-edit-google-client-secret"
            type="text"
            value={this.state.clientSecret}
            disabled={shouldDisableForm}
            onChange={this.onClientSecretChange}
            placeholder={secretPlaceholder}
          />
        </FormGroup>
        <Button variant="primary" type="submit" disabled={shouldDisableForm} onSubmit={this.onSubmitOauthConfiguration}>
          Save
        </Button>
      </form>
    );
  }
}

type GoogleAuthorizeDriveClientFormState = {
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS;
} | {
  submitState: SubmitState.ERROR;
  error: Error;
}

class GoogleAuthorizeDriveClientForm extends React.Component<{}, GoogleAuthorizeDriveClientFormState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      submitState: SubmitState.IDLE,
    };
  }

  dismissAlert = () => {
    this.setState({ submitState: SubmitState.IDLE });
  };

  requestComplete = (token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    this.setState({ submitState: SubmitState.SUBMITTING });
    Meteor.call('setupGdriveCreds', token, secret, (error?: Error) => {
      if (error) {
        this.setState({ submitState: SubmitState.ERROR, error });
      } else {
        this.setState({ submitState: SubmitState.SUCCESS });
      }
    });
  };

  showPopup = () => {
    Google.requestCredential({
      requestPermissions: ['email', 'https://www.googleapis.com/auth/drive'],
      requestOfflineToken: true,
    }, this.requestComplete);
    return false;
  };

  render() {
    return (
      <div>
        {this.state.submitState === SubmitState.SUBMITTING ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === SubmitState.SUCCESS ? <Alert variant="success" onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === SubmitState.ERROR ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.error.message}
          </Alert>
        ) : null}
        <Button variant="primary" onClick={this.showPopup}>Link a Google account</Button>
        for Google Drive management. (This will replace any previously configured account)
      </div>
    );
  }
}

interface GoogleDriveTemplateFormProps {
  initialDocTemplate?: string;
  initialSpreadsheetTemplate?: string;
}

type GoogleDriveTemplateFormState = {
  docTemplate: string;
  spreadsheetTemplate: string;
} & ({
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS;
} | {
  submitState: SubmitState.ERROR;
  error: Error;
})

class GoogleDriveTemplateForm extends React.Component<GoogleDriveTemplateFormProps, GoogleDriveTemplateFormState> {
  constructor(props: GoogleDriveTemplateFormProps) {
    super(props);
    this.state = {
      submitState: SubmitState.IDLE,
      docTemplate: props.initialDocTemplate || '',
      spreadsheetTemplate: props.initialSpreadsheetTemplate || '',
    };
  }

  dismissAlert = () => {
    this.setState({ submitState: SubmitState.IDLE });
  };

  onSpreadsheetTemplateChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      spreadsheetTemplate: e.currentTarget.value,
    });
  };

  onDocTemplateChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      docTemplate: e.currentTarget.value,
    });
  };

  saveTemplates = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const ssTemplate = this.state.spreadsheetTemplate.trim();
    const ssId = ssTemplate.length > 0 ? ssTemplate : undefined;
    const docTemplateString = this.state.docTemplate.trim();
    const docId = docTemplateString.length > 0 ? docTemplateString : undefined;
    this.setState({
      submitState: SubmitState.SUBMITTING,
    });
    Meteor.call('setupGdriveTemplates', ssId, docId, (error?: Error) => {
      if (error) {
        this.setState({ submitState: SubmitState.ERROR, error } as GoogleDriveTemplateFormState);
      } else {
        this.setState({ submitState: SubmitState.SUCCESS });
      }
    });
  };

  render() {
    const shouldDisableForm = this.state.submitState === 'submitting';
    return (
      <div>
        {this.state.submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === 'success' ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === 'error' ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.error.message}
          </Alert>
        ) : null}
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-gdrive-sheet-template">
            Spreadsheet template doc id
          </FormLabel>
          <FormControl
            id="jr-setup-edit-gdrive-sheet-template"
            type="text"
            value={this.state.spreadsheetTemplate}
            disabled={shouldDisableForm}
            onChange={this.onSpreadsheetTemplateChange}
          />
        </FormGroup>
        <FormGroup>
          <FormLabel htmlFor="jr-setup-edit-gdrive-doc-template">
            Document template doc id
          </FormLabel>
          <FormControl
            id="jr-setup-edit-gdrive-doc-template"
            type="text"
            value={this.state.docTemplate}
            disabled={shouldDisableForm}
            onChange={this.onDocTemplateChange}
          />
        </FormGroup>
        <Button variant="primary" onClick={this.saveTemplates} disabled={shouldDisableForm}>Save</Button>
      </div>
    );
  }
}

interface GoogleIntegrationSectionProps {
  oauthSettings: any;
  gdriveCredential: any;
  docTemplate?: string;
  spreadsheetTemplate?: string;
  enabled: boolean;
}

class GoogleIntegrationSection extends React.Component<GoogleIntegrationSectionProps> {
  onToggleEnabled = () => {
    const newValue = !this.props.enabled;
    const ffValue = newValue ? 'off' : 'on';
    Meteor.call('setFeatureFlag', 'disable.google', ffValue);
  };

  disconnectGdrive = () => {
    Meteor.call('clearGdriveCreds');
  };

  render() {
    const firstButtonLabel = this.props.enabled ? 'Enabled' : 'Enable';
    const secondButtonLabel = this.props.enabled ? 'Disable' : 'Disabled';
    const clientId = (this.props.oauthSettings && this.props.oauthSettings.clientId) || '';

    let stepsDone = 0;
    if (this.props.oauthSettings) {
      stepsDone += 1;
    }
    if (this.props.gdriveCredential) {
      stepsDone += 1;
    }
    if (this.props.spreadsheetTemplate) {
      stepsDone += 1;
    }

    const comp = googleCompletenessStrings[stepsDone];
    const compBadgeVariant = stepsDone === 3 ? 'success' : 'warning';
    const oauthBadgeLabel = this.props.oauthSettings ? 'configured' : 'unconfigured';
    const oauthBadgeVariant = this.props.oauthSettings ? 'success' : 'warning';
    const driveBadgeLabel = this.props.gdriveCredential ? 'configured' : 'unconfigured';
    const driveBadgeVariant = this.props.gdriveCredential ? 'success' : 'warning';
    const maybeDriveUserEmail = this.props.gdriveCredential && this.props.gdriveCredential.value && this.props.gdriveCredential.value.email;
    const templateBadgeLabel = this.props.spreadsheetTemplate ? 'configured' : 'unconfigured';
    const templateBadgeVariant = this.props.spreadsheetTemplate ? 'success' : 'warning';

    return (
      <section id="google">
        <h1 className="setup-section-header">
          <span className="setup-section-header-label">
            Google integration
          </span>
          <Badge variant={compBadgeVariant}>
            {comp}
          </Badge>
          <span className="setup-section-header-buttons">
            <Button variant="light" disabled={this.props.enabled} onClick={this.onToggleEnabled}>
              {firstButtonLabel}
            </Button>
            <Button variant="light" disabled={!this.props.enabled} onClick={this.onToggleEnabled}>
              {secondButtonLabel}
            </Button>
          </span>
        </h1>
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

        <div className="setup-subsection">
          <h2 className="setup-subsection-header">
            <span>OAuth client</span>
            {' '}
            <Badge variant={oauthBadgeVariant}>{oauthBadgeLabel}</Badge>
          </h2>
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
          <GoogleOAuthForm initialClientId={clientId} isConfigured={!!this.props.oauthSettings} />
        </div>

        <div className="setup-subsection">
          <h2 className="setup-subsection-header">
            <span>Drive user</span>
            {' '}
            <Badge variant={driveBadgeVariant}>{driveBadgeLabel}</Badge>
          </h2>
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
              Currently connected as <strong>{maybeDriveUserEmail}</strong>. <Button onClick={this.disconnectGdrive}>Disconnect</Button>
            </p>
          )}
          <GoogleAuthorizeDriveClientForm />
        </div>

        <div className="setup-subsection">
          <h2 className="setup-subsection-header">
            <span>Document templates</span>
            {' '}
            <Badge variant={templateBadgeVariant}>{templateBadgeLabel}</Badge>
          </h2>
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
            initialSpreadsheetTemplate={this.props.spreadsheetTemplate}
            initialDocTemplate={this.props.docTemplate}
          />
        </div>
      </section>
    );
  }
}

interface EmailConfigFormProps {
  initialConfig: SettingType | undefined;
}

interface EmailConfigFormState {
  from: string;
  enrollAccountSubject: string;
  enrollAccountMessage: string;
  existingJoinSubject: string;
  existingJoinMessage: string;
  submitState: SubmitState;
  submitError: string;
}

class EmailConfigForm extends React.Component<EmailConfigFormProps, EmailConfigFormState> {
  constructor(props: EmailConfigFormProps) {
    super(props);
    const initialConfig = this.props.initialConfig;
    let initialState = {
      from: '',
      enrollAccountSubject: '',
      enrollAccountMessage: '',
      existingJoinSubject: '',
      existingJoinMessage: '',
      submitState: SubmitState.IDLE,
      submitError: '',
    };
    if (initialConfig && initialConfig.name === 'email.branding') {
      const value = initialConfig.value;
      initialState = {
        from: value.from || '',
        enrollAccountSubject: value.enrollAccountMessageSubjectTemplate || '',
        enrollAccountMessage: value.enrollAccountMessageTemplate || '',
        existingJoinSubject: value.existingJoinMessageSubjectTemplate || '',
        existingJoinMessage: value.existingJoinMessageTemplate || '',
        submitState: SubmitState.IDLE,
        submitError: '',
      };
    }

    this.state = initialState;
  }

  dismissAlert = () => {
    this.setState({ submitState: SubmitState.IDLE });
  };

  onFromChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      from: e.currentTarget.value,
    });
  };

  onEnrollSubjectChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      enrollAccountSubject: e.currentTarget.value,
    });
  };

  onEnrollMessageChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      enrollAccountMessage: e.currentTarget.value,
    });
  };

  onJoinSubjectChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      existingJoinSubject: e.currentTarget.value,
    });
  };

  onJoinMessageChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      existingJoinMessage: e.currentTarget.value,
    });
  };

  saveConfig = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const from = this.state.from.trim();
    const enrollAccountMessageSubject = this.state.enrollAccountSubject.trim();
    const enrollAccountMessage = this.state.enrollAccountMessage.trim();
    const existingJoinMessageSubject = this.state.existingJoinSubject.trim();
    const existingJoinMessage = this.state.existingJoinMessage.trim();
    this.setState({
      submitState: SubmitState.SUBMITTING,
    });
    Meteor.call('setupEmailBranding', from, enrollAccountMessageSubject, enrollAccountMessage,
      existingJoinMessageSubject, existingJoinMessage, (error?: Error) => {
        if (error) {
          this.setState({
            submitState: SubmitState.ERROR,
            submitError: error.message,
          });
        } else {
          this.setState({ submitState: SubmitState.SUCCESS });
        }
      });
  };

  render() {
    const shouldDisableForm = this.state.submitState === 'submitting';
    return (
      <div>
        {this.state.submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === 'success' ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === 'error' ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
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
            value={this.state.from}
            disabled={shouldDisableForm}
            onChange={this.onFromChange}
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
            value={this.state.enrollAccountSubject}
            disabled={shouldDisableForm}
            onChange={this.onEnrollSubjectChange}
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
            value={this.state.enrollAccountMessage}
            disabled={shouldDisableForm}
            onChange={this.onEnrollMessageChange}
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
            value={this.state.existingJoinSubject}
            disabled={shouldDisableForm}
            onChange={this.onJoinSubjectChange}
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
            value={this.state.existingJoinMessage}
            disabled={shouldDisableForm}
            onChange={this.onJoinMessageChange}
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
        <Button variant="primary" onClick={this.saveConfig} disabled={shouldDisableForm}>Save</Button>
      </div>
    );
  }
}

interface EmailConfigSectionProps {
  config: SettingType | undefined;
}

class EmailConfigSection extends React.Component<EmailConfigSectionProps> {
  render() {
    const configured = this.props.config && this.props.config.name === 'email.branding' && this.props.config.value.from;
    const badgeVariant = configured ? 'success' : 'warning';
    return (
      <section id="email">
        <h1 className="setup-section-header">
          <span className="setup-section-header-label">
            Email configuration
          </span>
          <Badge variant={badgeVariant}>
            {configured ? 'Configured' : 'Unconfigured'}
          </Badge>
        </h1>
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
        <EmailConfigForm initialConfig={this.props.config} />
      </section>
    );
  }
}

interface DiscordOAuthFormProps {
  configured: boolean;
  enabled: boolean;
  oauthSettings: any;
}

interface DiscordOAuthFormState {
  clientId: string;
  clientSecret: string;
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS | SubmitState.ERROR;
  submitError: string;
}

class DiscordOAuthForm extends React.Component<DiscordOAuthFormProps, DiscordOAuthFormState> {
  constructor(props: DiscordOAuthFormProps) {
    super(props);
    this.state = {
      clientId: (props.oauthSettings && props.oauthSettings.appId) || '',
      clientSecret: (props.oauthSettings && props.oauthSettings.secret) || '',
      submitState: SubmitState.IDLE,
      submitError: '',
    };
  }

  dismissAlert = () => {
    this.setState({
      submitState: SubmitState.IDLE,
    });
  };

  onClientIdChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      clientId: e.currentTarget.value,
    });
  };

  onClientSecretChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      clientSecret: e.currentTarget.value,
    });
  };

  onSubmitOauthConfiguration = (e: React.FormEvent<any>) => {
    e.preventDefault();

    const clientId = this.state.clientId.trim();
    const clientSecret = this.state.clientSecret.trim();

    if (clientId.length > 0 && clientSecret.length === 0) {
      this.setState({
        submitState: SubmitState.ERROR,
        submitError: 'You appear to be clearing the secret but not the client ID.  Please provide a secret.',
      } as DiscordOAuthFormState);
    } else {
      this.setState({
        submitState: SubmitState.SUBMITTING,
      });
      Meteor.call('setupDiscordOAuthClient', clientId, clientSecret, (err?: Error) => {
        if (err) {
          this.setState({
            submitState: SubmitState.ERROR,
            submitError: err.message,
          } as DiscordOAuthFormState);
        } else {
          this.setState({
            submitState: SubmitState.SUCCESS,
          });
        }
      });
    }
  };

  render() {
    const shouldDisableForm = this.state.submitState === 'submitting';
    const configured = !!this.props.oauthSettings;
    const secretPlaceholder = configured ? '<configured secret not revealed>' : '';
    return (
      <div>
        {this.state.submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === 'success' ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === 'error' ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
          </Alert>
        ) : null}

        {/* TODO: UI for client ID and client secret */}
        <form onSubmit={this.onSubmitOauthConfiguration}>
          <FormGroup>
            <FormLabel htmlFor="jr-setup-edit-discord-client-id">
              Client ID
            </FormLabel>
            <FormControl
              id="jr-setup-edit-discord-client-id"
              type="text"
              placeholder=""
              value={this.state.clientId}
              disabled={shouldDisableForm}
              onChange={this.onClientIdChange}
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
              value={this.state.clientSecret}
              disabled={shouldDisableForm}
              onChange={this.onClientSecretChange}
            />
          </FormGroup>
          <Button variant="primary" type="submit" onClick={this.onSubmitOauthConfiguration} disabled={shouldDisableForm}>Save</Button>
        </form>
      </div>
    );
  }
}

interface DiscordBotFormProps {
  botToken?: string
}

interface DiscordBotFormState {
  botToken: string;
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS | SubmitState.ERROR;
  submitError: string;
}

class DiscordBotForm extends React.Component<DiscordBotFormProps, DiscordBotFormState> {
  constructor(props: DiscordBotFormProps) {
    super(props);
    this.state = {
      botToken: props.botToken || '',
      submitState: SubmitState.IDLE,
      submitError: '',
    };
  }

  dismissAlert = () => {
    this.setState({
      submitState: SubmitState.IDLE,
    });
  };

  onBotTokenChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      botToken: e.currentTarget.value,
    });
  };

  onSubmitBotToken = (e: React.FormEvent<any>) => {
    e.preventDefault();

    const botToken = this.state.botToken.trim();

    this.setState({
      submitState: SubmitState.SUBMITTING,
    });
    Meteor.call('setupDiscordBotToken', botToken, (err?: Error) => {
      if (err) {
        this.setState({
          submitState: SubmitState.ERROR,
          submitError: err.message,
        });
      } else {
        this.setState({
          submitState: SubmitState.SUCCESS,
        });
      }
    });
  };

  render() {
    const shouldDisableForm = this.state.submitState === SubmitState.SUBMITTING;
    return (
      <div>
        {this.state.submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === 'success' ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === 'error' ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
          </Alert>
        ) : null}

        <form onSubmit={this.onSubmitBotToken}>
          <FormGroup>
            <FormLabel htmlFor="jr-setup-edit-discord-bot-token">
              Bot token
            </FormLabel>
            <FormControl
              id="jr-setup-edit-discord-bot-token"
              type="text"
              placeholder=""
              value={this.state.botToken}
              disabled={shouldDisableForm}
              onChange={this.onBotTokenChange}
            />
          </FormGroup>
          <Button variant="primary" type="submit" onClick={this.onSubmitBotToken} disabled={shouldDisableForm}>Save</Button>
        </form>
      </div>
    );
  }
}

interface DiscordGuildFormContainerProps {
  // initial value from settings
  guild?: DiscordGuildType;
}

interface DiscordGuildFormProps extends DiscordGuildFormContainerProps {
  ready: boolean;
  // List of possible guilds from server
  guilds: DiscordGuildType[];
}

interface DiscordGuildFormState {
  guildId: string;
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS | SubmitState.ERROR;
  submitError: string;
}

class DiscordGuildForm extends React.Component<DiscordGuildFormProps, DiscordGuildFormState> {
  constructor(props: DiscordGuildFormProps) {
    super(props);
    this.state = {
      guildId: (props.guild && props.guild.id) || '',
      submitState: SubmitState.IDLE,
      submitError: '',
    };
  }

  dismissAlert = () => {
    this.setState({
      submitState: SubmitState.IDLE,
    });
  };

  onSelectedGuildChange: FormControlProps['onChange'] = (e) => {
    const newValue = e.currentTarget.value === 'empty' ? '' : e.currentTarget.value;
    this.setState({
      guildId: newValue,
    });
  };

  onSaveGuild = (e: React.FormEvent<any>) => {
    e.preventDefault();

    const guild = this.props.guilds.find((g) => g.id === this.state.guildId);
    this.setState({
      submitState: SubmitState.SUBMITTING,
    });
    Meteor.call('setupDiscordBotGuild', guild, (err?: Error) => {
      if (err) {
        this.setState({
          submitState: SubmitState.ERROR,
          submitError: err.message,
        });
      } else {
        this.setState({
          submitState: SubmitState.SUCCESS,
        });
      }
    });
  };

  render() {
    const shouldDisableForm = this.state.submitState === SubmitState.SUBMITTING;
    const noneOption = {
      id: 'empty',
      name: 'No guild assigned',
    };
    const formOptions = [noneOption, ...this.props.guilds];
    return (
      <div>
        {this.state.submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === 'success' ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === 'error' ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
          </Alert>
        ) : null}

        <form onSubmit={this.onSaveGuild}>
          <FormGroup>
            <FormLabel htmlFor="jr-setup-edit-discord-bot-guild">
              Guild
            </FormLabel>
            <FormControl
              id="jr-setup-edit-discord-bot-guild"
              as="select"
              type="text"
              placeholder=""
              value={this.state.guildId}
              disabled={shouldDisableForm}
              onChange={this.onSelectedGuildChange}
            >
              {formOptions.map(({ id, name }) => {
                return (
                  <option key={id} value={id}>{name}</option>
                );
              })}
            </FormControl>
          </FormGroup>
          <Button variant="primary" type="submit" onClick={this.onSaveGuild} disabled={shouldDisableForm}>Save</Button>
        </form>
      </div>
    );
  }
}

const DiscordGuildFormContainer = withTracker((_props: DiscordGuildFormContainerProps) => {
  // DiscordGuilds is a pseudocollection, and the subscribe here causes the
  // server to do a call against the Discord API to list guilds the user is in.
  // It's not reactive; you might have to refresh the page to get it to update.
  // Didn't seem worth making cleverer; this will get used ~once.
  const guildSub = Meteor.subscribe('discord.guilds');
  const ready = guildSub.ready();
  const guilds = DiscordCache.find({ type: 'guild' }).fetch().map((c) => c.object as DiscordGuildType);
  return {
    ready,
    guilds,
  };
})(DiscordGuildForm);

interface DiscordIntegrationSectionProps {
  configured: boolean;
  enabled: boolean;
  oauthSettings?: Configuration;
  botToken?: string;
  guild?: DiscordGuildType;
}

class DiscordIntegrationSection extends React.Component<DiscordIntegrationSectionProps> {
  onToggleEnabled = () => {
    const newValue = !this.props.enabled;
    const ffValue = newValue ? 'off' : 'on';
    Meteor.call('setFeatureFlag', 'disable.discord', ffValue);
  };

  render() {
    const firstButtonLabel = this.props.enabled ? 'Enabled' : 'Enable';
    const secondButtonLabel = this.props.enabled ? 'Disable' : 'Disabled';

    const configured = !!this.props.oauthSettings;
    const headerBadgeVariant = configured ? 'success' : 'warning';
    const clientId = this.props.oauthSettings && this.props.oauthSettings.appId;
    const addGuildLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=8`;
    const oauthBadgeLabel = this.props.oauthSettings ? 'configured' : 'unconfigured';
    const oauthBadgeVariant = this.props.oauthSettings ? 'success' : 'warning';
    const botBadgeLabel = this.props.botToken ? 'configured' : 'unconfigured';
    const botBadgeVariant = this.props.botToken ? 'success' : 'warning';
    const guildBadgeLabel = this.props.guild ? 'configured' : 'unconfigured';
    const guildBadgeVariant = this.props.guild ? 'success' : 'warning';
    return (
      <section id="discord">
        <h1 className="setup-section-header">
          <span className="setup-section-header-label">
            Discord integration
          </span>
          <Badge variant={headerBadgeVariant}>
            {configured ? 'Configured' : 'Unconfigured'}
          </Badge>
          {configured && (
          <span className="setup-section-header-buttons">
            <Button variant="light" disabled={this.props.enabled} onClick={this.onToggleEnabled}>
              {firstButtonLabel}
            </Button>
            <Button variant="light" disabled={!this.props.enabled} onClick={this.onToggleEnabled}>
              {secondButtonLabel}
            </Button>
          </span>
          )}
        </h1>

        <p>
          Jolly Roger supports a Discord integration, where this instance
          connects to Discord as a bot user with several useful capabilities.
        </p>
        <ul>
          <li>(TODO): It can invite users to a guild (&quot;server&quot;) that it is a member of</li>
          <li>(TODO): It can send messages to a channel on new puzzle creation, or when a puzzle is solved</li>
          <li>(TODO): It can send messages to a channel when a new announcement is created</li>
          <li>(TODO): It can send messages to a channel when users write chat messages on puzzle pages</li>
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

        <div className="setup-subsection">
          <h2 className="setup-subsection-header">
            <span>OAuth client</span>
            {' '}
            <Badge variant={oauthBadgeVariant}>{oauthBadgeLabel}</Badge>
          </h2>
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
          <DiscordOAuthForm
            configured={this.props.configured}
            enabled={this.props.enabled}
            oauthSettings={this.props.oauthSettings}
          />
        </div>

        <div className="setup-subsection">
          <h2 className="setup-subsection-header">
            <span>Bot account</span>
            {' '}
            <Badge variant={botBadgeVariant}>{botBadgeLabel}</Badge>
          </h2>
          <p>
            Since Discord only allows guild invitations to be managed by bot
            accounts, to use Jolly Roger to automate Discord guild membership,
            you must create a bot account, save its token here, and then add
            it to the guild for which you wish to automate invites.
          </p>
          <DiscordBotForm
            botToken={this.props.botToken}
          />
        </div>

        <div className="setup-subsection">
          <h2 className="setup-subsection-header">
            <span>Guild</span>
            {' '}
            <Badge variant={guildBadgeVariant}>{guildBadgeLabel}</Badge>
          </h2>
          <p>
            Since bots can be part of multiple guilds, you&apos;ll need to specify
            which one you want Jolly Roger to add users to.  Note that Discord
            bots can only add other users to guilds which they are already a
            member of, so if you see no guilds selectable here, you may need
            to first <a href={addGuildLink}>add the bot to your guild</a>.
          </p>

          <DiscordGuildFormContainer
            guild={this.props.guild}
          />
        </div>
      </section>
    );
  }
}

interface WebRTCServersFormProps {
  urls: string[];
  secret: string;
}

interface WebRTCServersFormState {
  urls: string;
  secret: string;
  submitState: SubmitState.IDLE | SubmitState.SUBMITTING | SubmitState.SUCCESS | SubmitState.ERROR;
  submitError: string;
}

class WebRTCServersForm extends React.Component<WebRTCServersFormProps, WebRTCServersFormState> {
  constructor(props: WebRTCServersFormProps) {
    super(props);
    this.state = {
      urls: props.urls.length > 0 ? props.urls.join(',') : '',
      secret: props.secret || '',
      submitState: SubmitState.IDLE,
      submitError: '',
    };
  }

  dismissAlert = () => {
    this.setState({
      submitState: SubmitState.IDLE,
    });
  };

  onUrlChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      urls: e.currentTarget.value,
    });
  };

  onSecretChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      secret: e.currentTarget.value,
    });
  };

  onSubmit = (e: React.FormEvent<any>) => {
    e.preventDefault();

    const urls = this.state.urls.trim().split(',');
    const secret = this.state.secret.trim();

    this.setState({
      submitState: SubmitState.SUBMITTING,
    });
    Meteor.call('setupTurnServerConfig', secret, urls, (err?: Error) => {
      if (err) {
        this.setState({
          submitState: SubmitState.ERROR,
          submitError: err.message,
        });
      } else {
        this.setState({
          submitState: SubmitState.SUCCESS,
        });
      }
    });
  };

  render() {
    const shouldDisableForm = this.state.submitState === SubmitState.SUBMITTING;
    return (
      <div>
        {this.state.submitState === 'submitting' ? <Alert variant="info">Saving...</Alert> : null}
        {this.state.submitState === 'success' ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.submitState === 'error' ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
          </Alert>
        ) : null}

        <form onSubmit={this.onSubmit}>
          <FormGroup>
            <FormLabel htmlFor="jr-setup-edit-webrtc-turn-server-url">
              TURN server URLs (comma-separated)
            </FormLabel>
            <FormControl
              id="jr-setup-edit-webrtc-turn-server-url"
              type="text"
              placeholder=""
              value={this.state.urls}
              disabled={shouldDisableForm}
              onChange={this.onUrlChange}
            />
          </FormGroup>
          <FormGroup>
            <FormLabel htmlFor="jr-setup-edit-webrtc-turn-server-secret">
              TURN server shared secret
            </FormLabel>
            <FormControl
              id="jr-setup-edit-webrtc-turn-server-secret"
              type="text"
              placeholder=""
              value={this.state.secret}
              disabled={shouldDisableForm}
              onChange={this.onSecretChange}
            />
          </FormGroup>
          <Button variant="primary" type="submit" onClick={this.onSubmit} disabled={shouldDisableForm}>Save</Button>
        </form>
      </div>
    );
  }
}

interface WebRTCSectionProps {
  turnServerUrls: string[];
  turnServerSecret: string;
}

class WebRTCSection extends React.Component<WebRTCSectionProps> {
  render() {
    return (
      <section id="webrtc">
        <h1 className="setup-section-header">
          <span className="setup-section-header-label">
            WebRTC
          </span>
        </h1>

        <div className="setup-subsection">
          <h2 className="setup-subsection-header">
            <span>Turn server configuration</span>
          </h2>
          <p>
            To use WebRTC, you need to configure a STUN/TURN server which you
            operate.  Specifically, you must provide at least one URL (like
            {' '}
            <code>stun:turn.deathandmayhem.com</code>
            {' '}
            or
            {' '}
            <code>turn:turn.deathandmayhem.com</code>
            ) for clients to be able to discover ICE candidates and connect
            directly to each other to exchange audio streams.
          </p>

          <p>
            Since TURN involves relaying, which is expensive in terms of
            bandwidth for the server operator, it also requires authentication.
            The simplest deployment supporting authentication involves a single
            shared secret between Jolly Roger and the TURN server, per
            {' '}
            <a target="_blank" rel="noopener noreferrer" href="https://tools.ietf.org/html/draft-uberti-behave-turn-rest-00">
              A REST API For Access to TURN Services
            </a>.
            Generate a random string, then provide it both here and in the
            configuration for your TURN server.  If you plan to run
            {' '}
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/coturn/coturn">
              coturn
            </a>
            , this means a config file with:
          </p>
          <pre>
            use-auth-secret<br />
            static-auth-secret={this.props.turnServerSecret}
          </pre>
          <WebRTCServersForm
            secret={this.props.turnServerSecret}
            urls={this.props.turnServerUrls}
          />
        </div>
      </section>
    );
  }
}

interface CircuitBreakerControlProps {
  // disabled should be false if the circuit breaker is not intentionally disabling the feature,
  // and true if the feature is currently disabled.
  // most features will have false here most of the time.
  featureDisabled: boolean;

  // What do you call this circuit breaker?
  title: string;

  // some explanation of what this feature flag controls and why you might want to toggle it.
  children: React.ReactNode;

  // callback to call when the user requests changing this flag's state
  onChange: (desiredState: boolean) => void;
}

class CircuitBreakerControl extends React.Component<CircuitBreakerControlProps> {
  onChange = () => {
    const desiredState = !this.props.featureDisabled;
    this.props.onChange(desiredState);
  };

  render() {
    // Is the feature that this circuit breaker disables currently available?
    const featureIsEnabled = !this.props.featureDisabled;
    const firstButtonLabel = featureIsEnabled ? 'Enabled' : 'Enable';
    const secondButtonLabel = featureIsEnabled ? 'Disable' : 'Disabled';

    return (
      <div className="circuit-breaker">
        <div className="circuit-breaker-row">
          <div className="circuit-breaker-label">
            {this.props.title}
          </div>
          <div className="circuit-breaker-buttons">
            <Button variant="light" disabled={featureIsEnabled} onClick={this.onChange}>
              {firstButtonLabel}
            </Button>
            <Button variant="light" disabled={!featureIsEnabled} onClick={this.onChange}>
              {secondButtonLabel}
            </Button>
          </div>
        </div>
        <div className="circuit-breaker-description">
          {this.props.children}
        </div>
      </div>
    );
  }
}

interface CircuitBreakerSectionProps {
  flagDisableGdrivePermissions: boolean;
  flagDisableApplause: boolean;
  flagDisableWebrtc: boolean;
  flagDisableSpectra: boolean;
  flagDisableDingwords: boolean;
}

class CircuitBreakerSection extends React.Component<CircuitBreakerSectionProps> {
  setFlagValue(flag: string, value: boolean) {
    const type = value ? 'on' : 'off';
    Meteor.call('setFeatureFlag', flag, type);
  }

  render() {
    return (
      <section id="circuit-breakers">
        <h1 className="setup-section-header">
          Circuit breakers
        </h1>
        <p>
          Jolly Roger has several features which can be responsible for high
          server load or increased latency.  We allow them to be disabled at
          runtime to enable graceful degradation if your deployment is having
          issues.
        </p>
        <CircuitBreakerControl
          title="Drive permission sharing"
          featureDisabled={this.props.flagDisableGdrivePermissions}
          onChange={(newValue) => this.setFlagValue('disable.gdrive_permissions', newValue)}
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
          featureDisabled={this.props.flagDisableApplause}
          onChange={(newValue) => this.setFlagValue('disable.applause', newValue)}
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
          featureDisabled={this.props.flagDisableWebrtc}
          onChange={(newValue) => this.setFlagValue('disable.webrtc', newValue)}
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
          featureDisabled={this.props.flagDisableSpectra}
          onChange={(newValue) => this.setFlagValue('disable.spectra', newValue)}
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
          featureDisabled={this.props.flagDisableDingwords}
          onChange={(newValue) => this.setFlagValue('disable.dingwords', newValue)}
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
      </section>
    );
  }
}

interface SetupPageRewriteProps {
  ready: boolean;

  canConfigure: boolean;

  googleConfig: any;
  gdriveCredential: any;
  docTemplate?: string;
  spreadsheetTemplate?: string;

  emailConfig: SettingType | undefined;

  discordOAuthConfig?: Configuration;
  flagDisableDiscord: boolean;
  discordBotToken?: string;
  discordGuild?: DiscordGuildType;

  turnServerUrls: string[];
  turnServerSecret: string;

  flagDisableGoogleIntegration: boolean;
  flagDisableGdrivePermissions: boolean;
  flagDisableApplause: boolean;
  flagDisableWebrtc: boolean;
  flagDisableSpectra: boolean;
  flagDisableDingwords: boolean;
}

class SetupPageRewrite extends React.Component<SetupPageRewriteProps> {
  render() {
    if (!this.props.ready) {
      return (
        <div className="setup-page">
          Loading...
        </div>
      );
    }

    if (!this.props.canConfigure) {
      return (
        <div className="setup-page">
          <h1>Not authorized</h1>
          <p>This page allows server admins to reconfigure the server, but you&apos;re not an admin.</p>
        </div>
      );
    }

    const discordConfigured = !!this.props.discordOAuthConfig;
    const discordEnabled = !this.props.flagDisableDiscord;
    return (
      <div className="setup-page">
        <GoogleIntegrationSection
          oauthSettings={this.props.googleConfig}
          enabled={!this.props.flagDisableGoogleIntegration}
          gdriveCredential={this.props.gdriveCredential}
          docTemplate={this.props.docTemplate}
          spreadsheetTemplate={this.props.spreadsheetTemplate}
        />
        <EmailConfigSection
          config={this.props.emailConfig}
        />
        <DiscordIntegrationSection
          oauthSettings={this.props.discordOAuthConfig}
          configured={discordConfigured}
          enabled={discordEnabled}
          botToken={this.props.discordBotToken}
          guild={this.props.discordGuild}
        />
        <WebRTCSection
          turnServerUrls={this.props.turnServerUrls}
          turnServerSecret={this.props.turnServerSecret}
        />
        <CircuitBreakerSection
          flagDisableGdrivePermissions={this.props.flagDisableGdrivePermissions}
          flagDisableApplause={this.props.flagDisableApplause}
          flagDisableWebrtc={this.props.flagDisableWebrtc}
          flagDisableSpectra={this.props.flagDisableSpectra}
          flagDisableDingwords={this.props.flagDisableDingwords}
        />
      </div>
    );
  }
}

const crumb = withBreadcrumb({ title: 'Server setup', path: '/setup' });
const tracker = withTracker((): SetupPageRewriteProps => {
  const canConfigure = Roles.userHasRole(Meteor.userId()!, 'admin');

  // We need to fetch the contents of the Settings table
  const settingsHandle = Meteor.subscribe('mongo.settings');

  // Google
  const googleConfig = ServiceConfiguration.configurations.findOne({ service: 'google' });
  const gdriveCredential = Settings.findOne({ name: 'gdrive.credential' });
  const docTemplate = Settings.findOne({ name: 'gdrive.template.document' });
  const docTemplateId = docTemplate && docTemplate.name === 'gdrive.template.document' ?
    docTemplate.value.id : undefined;
  const spreadsheetTemplate = Settings.findOne({ name: 'gdrive.template.spreadsheet' });
  const spreadsheetTemplateId = spreadsheetTemplate && spreadsheetTemplate.name === 'gdrive.template.spreadsheet' ?
    spreadsheetTemplate.value.id : undefined;

  // Email
  const emailConfig = Settings.findOne({ name: 'email.branding' });

  // Discord
  const discordOAuthConfig = ServiceConfiguration.configurations.findOne({ service: 'discord' });
  const flagDisableDiscord = Flags.active('disable.discord');
  const discordBotTokenDoc = Settings.findOne({ name: 'discord.bot' });
  const discordBotToken = discordBotTokenDoc && discordBotTokenDoc.name === 'discord.bot' ? discordBotTokenDoc.value.token : undefined;
  const discordGuildDoc = Settings.findOne({ name: 'discord.guild' });
  const discordGuild = discordGuildDoc && discordGuildDoc.name === 'discord.guild' ? discordGuildDoc.value.guild : undefined;

  // WebRTC
  const maybeTurnServerConfig = Settings.findOne({ name: 'webrtc.turnserver' });
  const turnServerConfig = maybeTurnServerConfig && maybeTurnServerConfig.name === 'webrtc.turnserver' && maybeTurnServerConfig.value;
  const turnServerUrls = (turnServerConfig && turnServerConfig.urls) || [];
  const turnServerSecret = (turnServerConfig && turnServerConfig.secret) || '';

  // Circuit breakers
  const flagDisableGoogleIntegration = Flags.active('disable.google');
  const flagDisableGdrivePermissions = Flags.active('disable.gdrive_permissions');
  const flagDisableApplause = Flags.active('disable.applause');
  const flagDisableWebrtc = Flags.active('disable.webrtc');
  const flagDisableSpectra = Flags.active('disable.spectra');
  const flagDisableDingwords = Flags.active('disable.dingwords');

  return {
    ready: settingsHandle.ready(),

    canConfigure,

    googleConfig,
    gdriveCredential,
    docTemplate: docTemplateId,
    spreadsheetTemplate: spreadsheetTemplateId,

    emailConfig,

    discordOAuthConfig,
    flagDisableDiscord,
    discordBotToken,
    discordGuild,

    turnServerUrls,
    turnServerSecret,

    flagDisableGoogleIntegration,
    flagDisableGdrivePermissions,
    flagDisableApplause,
    flagDisableWebrtc,
    flagDisableSpectra,
    flagDisableDingwords,
  };
});

export default crumb(tracker(SetupPageRewrite));
