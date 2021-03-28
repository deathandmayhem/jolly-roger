import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import TeamName from '../team_name';

/* eslint-disable max-len, jsx-a11y/anchor-is-valid, jsx-a11y/label-has-associated-control, jsx-a11y/label-has-for */

export enum AccountFormFormat {
  LOGIN = 'login',
  REQUEST_PW_RESET = 'requestPwReset',
  ENROLL = 'enroll',
  RESET_PWD = 'resetPwd',
}

type AccountFormParams = {
  format: AccountFormFormat.LOGIN | AccountFormFormat.REQUEST_PW_RESET;
  onFormatChange: () => void;
} | {
  format: AccountFormFormat.ENROLL | AccountFormFormat.RESET_PWD;
  token: string;
}

type AccountFormProps = AccountFormParams & {
  teamName: string;
  ready: boolean;
}

enum AccountFormSubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  FAILED = 'failed',
  SUCCESS = 'success',
}

interface AccountFormState {
  submitState: AccountFormSubmitState;
  errorMessage?: string;
  successMessage?: string;
  email: string;
  password: string;
  displayName: string;
  phoneNumber: string;
}

class AccountForm extends React.Component<AccountFormProps, AccountFormState> {
  constructor(props: AccountFormProps) {
    super(props);
    this.state = {
      submitState: AccountFormSubmitState.IDLE,
      errorMessage: undefined,
      successMessage: undefined,
      email: '',
      password: '',
      displayName: '',
      phoneNumber: '',
    };
  }

  setEmail = (event: React.FormEvent<HTMLInputElement>) => {
    this.setState({
      email: event.currentTarget.value,
    });
  };

  setPassword = (event: React.FormEvent<HTMLInputElement>) => {
    this.setState({
      password: event.currentTarget.value,
    });
  };

  setDisplayName = (event: React.FormEvent<HTMLInputElement>) => {
    this.setState({
      displayName: event.currentTarget.value,
    });
  };

  setPhoneNumber = (event: React.FormEvent<HTMLInputElement>) => {
    this.setState({
      phoneNumber: event.currentTarget.value,
    });
  };

  tryLogin = () => {
    this.setState({
      submitState: AccountFormSubmitState.SUBMITTING,
    });
    Meteor.loginWithPassword(this.state.email, this.state.password, (error?: Error) => {
      if (error) {
        this.setState({
          submitState: AccountFormSubmitState.FAILED,
          errorMessage: (error instanceof Meteor.Error) ? error.reason : error.message,
        });
      } else {
        this.setState({
          submitState: AccountFormSubmitState.SUCCESS,
          successMessage: 'Logged in successfully.',
        });
      }
    });
  };

  tryPasswordReset = () => {
    this.setState({
      submitState: AccountFormSubmitState.IDLE,
    });
    Accounts.forgotPassword({ email: this.state.email }, (error?: Error) => {
      if (error) {
        this.setState({
          submitState: AccountFormSubmitState.FAILED,
          errorMessage: (error instanceof Meteor.Error) ? error.reason : error.message,
        });
      } else {
        this.setState({
          submitState: AccountFormSubmitState.SUCCESS,
          successMessage: 'Password reset email sent.',
        });
      }
    });
  };

  tryCompletePasswordReset = (token: string) => {
    Accounts.resetPassword(token, this.state.password, (error?: Error) => {
      if (error) {
        this.setState({
          submitState: AccountFormSubmitState.FAILED,
          errorMessage: (error instanceof Meteor.Error) ? error.reason : error.message,
        });
      } else {
        this.setState({
          submitState: AccountFormSubmitState.SUCCESS,
          successMessage: 'Password reset successfully',
        });
      }
    });
  };

  tryEnroll = (token: string) => {
    const newProfile = {
      displayName: this.state.displayName,
      phoneNumber: this.state.phoneNumber,
      muteApplause: false,
    };

    this.setState({
      submitState: AccountFormSubmitState.SUBMITTING,
    });

    Accounts.resetPassword(token, this.state.password, (error?: Error) => {
      if (error) {
        this.setState({
          submitState: AccountFormSubmitState.FAILED,
          errorMessage: (error instanceof Meteor.Error) ? error.reason : error.message,
        });
      } else {
        Meteor.call('saveProfile', newProfile, (innerError?: Error) => {
          if (innerError) {
            // This user will have to set their profile manually later.  Oh well.
            this.setState({
              submitState: AccountFormSubmitState.FAILED,
              errorMessage: (innerError instanceof Meteor.Error) ? innerError.reason : innerError.message,
            });
          } else {
            this.setState({
              submitState: AccountFormSubmitState.SUCCESS,
              successMessage: 'Created account successfully',
            });
          }
        });
      }
    });
  };

  submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    switch (this.props.format) {
      case AccountFormFormat.LOGIN:
        this.tryLogin();
        break;
      case AccountFormFormat.REQUEST_PW_RESET:
        this.tryPasswordReset();
        break;
      case AccountFormFormat.ENROLL:
        this.tryEnroll(this.props.token);
        break;
      case AccountFormFormat.RESET_PWD:
        this.tryCompletePasswordReset(this.props.token);
        break;
      default:
    }
  };

  toggleWantPasswordReset = (onFormatChange: () => void) => {
    return (event: React.MouseEvent) => {
      event.preventDefault();
      onFormatChange();
    };
  };

  render() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    }

    // I'm mimicking the DOM used by AccountTemplates for this form so I can reuse their CSS.  It
    // would probably be good to refactor this to use ReactBootstrap/additional styles directly and
    // drop AccountTemplates entirely.
    const submitting = this.state.submitState === AccountFormSubmitState.SUBMITTING;
    const format = this.props.format || AccountFormFormat.LOGIN;
    const title = {
      [AccountFormFormat.LOGIN]: `Jolly Roger: ${this.props.teamName} Virtual HQ`,
      [AccountFormFormat.ENROLL]: 'Create an Account',
      [AccountFormFormat.REQUEST_PW_RESET]: 'Reset your password',
      [AccountFormFormat.RESET_PWD]: 'Reset your password',
    }[format];

    const buttonText = {
      [AccountFormFormat.LOGIN]: 'Sign In',
      [AccountFormFormat.ENROLL]: 'Register',
      [AccountFormFormat.REQUEST_PW_RESET]: 'Email Reset Link',
      [AccountFormFormat.RESET_PWD]: 'Set Password',
    }[format];

    const emailInput = (
      <div className="at-input form-group">
        <label className="control-label" htmlFor="at-field-email">Email</label>
        <input
          id="at-field-email"
          className="form-control"
          type="email"
          name="at-field-email"
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect="off"
          onChange={this.setEmail}
          disabled={submitting}
        />
        <span className="help-block" hidden />
      </div>
    );
    const pwInput = (
      <div>
        <label className="control-label" htmlFor="at-field-password">Password</label>
        <input
          id="at-field-password"
          className="form-control"
          type="password"
          name="at-field-password"
          placeholder="Password"
          autoCapitalize="none"
          autoCorrect="off"
          onChange={this.setPassword}
          disabled={submitting}
        />
        <span className="help-block" hidden />
      </div>
    );
    const enrollmentFields = [
      <div className="at-input form-group">
        <label className="control-label" htmlFor="at-field-displayname">Full name</label>
        <input
          id="at-field-displayname"
          className="form-control"
          type="text"
          name="at-field-displayname"
          placeholder="Ben Bitdiddle"
          autoCapitalize="none"
          autoCorrect="off"
          onChange={this.setDisplayName}
          disabled={submitting}
        />
        <span className="help-block">For use in chat</span>
      </div>,
      <div className="at-input form-group">
        <label className="control-label" htmlFor="at-field-phonenumber">Phone Number</label>
        <input
          id="at-field-phonenumber"
          className="form-control"
          type="tel"
          name="at-field-phonenumber"
          placeholder="+16173244699"
          onChange={this.setPhoneNumber}
          disabled={submitting}
        />
        <span className="help-block">
          Optional, but helpful if HQ needs to reach you while you&apos;re
          on a runaround or at an event puzzle.
        </span>
      </div>,
    ];
    const pwResetOptionComponent = this.props.format === AccountFormFormat.LOGIN ? (
      <div className="at-pwd-link">
        <p>
          {/* TODO: prefer <Button variant="link"> */}
          <a href="#" id="at-forgotPwd" className="at-link at-pwd" onClick={this.toggleWantPasswordReset(this.props.onFormatChange)}>
            Forgot your password?
          </a>
        </p>
      </div>
    ) : null;
    const backToMainForm = this.props.format === AccountFormFormat.REQUEST_PW_RESET ? (
      <div className="at-signin-link">
        <p>
          {/* TODO: prefer <Button variant="link"> */}
          If you already have an account,
          {' '}
          <a href="#" id="at-signIn" className="at-link at-signin" onClick={this.toggleWantPasswordReset(this.props.onFormatChange)}>sign in</a>
        </p>
      </div>
    ) : null;
    return (
      <div className="at-form">
        <div className="at-title">
          <h3>{title}</h3>
        </div>
        <div>
          <form id="at-pwd-form" noValidate action="#" method="POST" onSubmit={this.submitForm}>
            <fieldset>
              {this.state.submitState === AccountFormSubmitState.FAILED ? <Alert variant="danger">{this.state.errorMessage}</Alert> : null}
              {this.state.submitState === AccountFormSubmitState.SUCCESS && this.state.successMessage ? <Alert variant="success">{this.state.successMessage}</Alert> : null}
              {format === AccountFormFormat.LOGIN || format === AccountFormFormat.REQUEST_PW_RESET ? emailInput : null}
              {format === AccountFormFormat.LOGIN || format === AccountFormFormat.ENROLL || format === AccountFormFormat.RESET_PWD ? pwInput : null}
              {pwResetOptionComponent}
              {format === AccountFormFormat.ENROLL ? enrollmentFields : null}
              <Button id="at-btn" size="lg" variant="outline-secondary" block className="at-btn submit" type="submit" disabled={submitting}>
                {buttonText}
              </Button>
              {backToMainForm}
            </fieldset>
          </form>
        </div>
      </div>
    );
  }
}

const tracker = withTracker((_params: AccountFormParams) => {
  const teamNameSub = Meteor.subscribe('teamName');
  const teamNameObj = TeamName.findOne('teamName');
  const teamName = teamNameObj ? teamNameObj.name : 'Default Team Name';
  return {
    ready: teamNameSub.ready(),
    teamName,
  };
});

export default tracker(AccountForm);
