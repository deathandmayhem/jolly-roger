import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useCallback, useState } from 'react';
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

type AccountFormProps = {
  format: AccountFormFormat.LOGIN | AccountFormFormat.REQUEST_PW_RESET;
  onFormatChange: () => void;
} | {
  format: AccountFormFormat.ENROLL | AccountFormFormat.RESET_PWD;
  token: string;
}

enum AccountFormSubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  FAILED = 'failed',
  SUCCESS = 'success',
}

const AccountForm = (props: AccountFormProps) => {
  const tracker = useTracker(() => {
    const teamNameSub = Meteor.subscribe('teamName');
    const teamNameObj = TeamName.findOne('teamName');
    const teamName = teamNameObj ? teamNameObj.name : 'Default Team Name';
    return {
      ready: teamNameSub.ready(),
      teamName,
    };
  }, []);

  const [submitState, setSubmitState] = useState<AccountFormSubmitState>(AccountFormSubmitState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const setEmailCallback = useCallback((e) => setEmail(e.currentTarget.value), []);
  const setPasswordCallback = useCallback((e) => setPassword(e.currentTarget.value), []);
  const setDisplayNameCallback = useCallback((e) => setDisplayName(e.currentTarget.value), []);
  const setPhoneNumberCallback = useCallback((e) => setPhoneNumber(e.currentTarget.value), []);
  const toggleWantPasswordReset = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (props.format === AccountFormFormat.LOGIN || props.format === AccountFormFormat.REQUEST_PW_RESET) {
      props.onFormatChange();
    }
  }, [props]);

  const tryLogin = useCallback(() => {
    setSubmitState(AccountFormSubmitState.SUBMITTING);
    Meteor.loginWithPassword(email, password, (error?: Error) => {
      if (error) {
        setSubmitState(AccountFormSubmitState.FAILED);
        setErrorMessage((error instanceof Meteor.Error) ? error.reason : error.message);
      } else {
        setSubmitState(AccountFormSubmitState.SUCCESS);
        setSuccessMessage('Logged in successfully.');
      }
    });
  }, [email, password]);

  const tryPasswordReset = useCallback(() => {
    setSubmitState(AccountFormSubmitState.SUBMITTING);
    Accounts.forgotPassword({ email }, (error?: Error) => {
      if (error) {
        setSubmitState(AccountFormSubmitState.FAILED);
        setErrorMessage((error instanceof Meteor.Error) ? error.reason : error.message);
      } else {
        setSubmitState(AccountFormSubmitState.SUCCESS);
        setSuccessMessage('Password reset email sent.');
      }
    });
  }, [email]);

  const tryCompletePasswordReset = useCallback((token: string) => {
    setSubmitState(AccountFormSubmitState.SUBMITTING);
    Accounts.resetPassword(token, password, (error?: Error) => {
      if (error) {
        setSubmitState(AccountFormSubmitState.FAILED);
        setErrorMessage((error instanceof Meteor.Error) ? error.reason : error.message);
      } else {
        setSubmitState(AccountFormSubmitState.SUCCESS);
        setSuccessMessage('Password reset successfully');
      }
    });
  }, [password]);

  const tryEnroll = useCallback((token: string) => {
    const newProfile = {
      displayName,
      phoneNumber,
      muteApplause: false,
      dingwords: [],
    };

    setSubmitState(AccountFormSubmitState.SUBMITTING);
    Accounts.resetPassword(token, password, (error?: Error) => {
      if (error) {
        setSubmitState(AccountFormSubmitState.FAILED);
        setErrorMessage((error instanceof Meteor.Error) ? error.reason : error.message);
      } else {
        Meteor.call('saveProfile', newProfile, (innerError?: Error) => {
          if (innerError) {
            // This user will have to set their profile manually later.  Oh well.
            setSubmitState(AccountFormSubmitState.FAILED);
            setErrorMessage((innerError instanceof Meteor.Error) ? innerError.reason : innerError.message);
          } else {
            setSubmitState(AccountFormSubmitState.SUCCESS);
            setSuccessMessage('Created account successfully');
          }
        });
      }
    });
  }, [displayName, phoneNumber, password]);

  const submitFormCallback = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    switch (props.format) {
      case AccountFormFormat.LOGIN:
        tryLogin();
        break;
      case AccountFormFormat.REQUEST_PW_RESET:
        tryPasswordReset();
        break;
      case AccountFormFormat.ENROLL:
        tryEnroll(props.token);
        break;
      case AccountFormFormat.RESET_PWD:
        tryCompletePasswordReset(props.token);
        break;
      default:
    }
  }, [tryLogin, tryPasswordReset, tryEnroll, tryCompletePasswordReset, props]);

  if (!tracker.ready) {
    return <div>loading...</div>;
  }

  // I'm mimicking the DOM used by AccountTemplates for this form so I can reuse their CSS.  It
  // would probably be good to refactor this to use ReactBootstrap/additional styles directly and
  // drop AccountTemplates entirely.
  const submitting = submitState === AccountFormSubmitState.SUBMITTING;
  const title = {
    [AccountFormFormat.LOGIN]: `Jolly Roger: ${tracker.teamName} Virtual HQ`,
    [AccountFormFormat.ENROLL]: 'Create an Account',
    [AccountFormFormat.REQUEST_PW_RESET]: 'Reset your password',
    [AccountFormFormat.RESET_PWD]: 'Reset your password',
  }[props.format];

  const buttonText = {
    [AccountFormFormat.LOGIN]: 'Sign In',
    [AccountFormFormat.ENROLL]: 'Register',
    [AccountFormFormat.REQUEST_PW_RESET]: 'Email Reset Link',
    [AccountFormFormat.RESET_PWD]: 'Set Password',
  }[props.format];

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
        onChange={setEmailCallback}
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
        onChange={setPasswordCallback}
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
        onChange={setDisplayNameCallback}
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
        onChange={setPhoneNumberCallback}
        disabled={submitting}
      />
      <span className="help-block">
        Optional, but helpful if HQ needs to reach you while you&apos;re
        on a runaround or at an event puzzle.
      </span>
    </div>,
  ];
  const pwResetOptionComponent = props.format === AccountFormFormat.LOGIN ? (
    <div className="at-pwd-link">
      <p>
        {/* TODO: prefer <Button variant="link"> */}
        <a href="#" id="at-forgotPwd" className="at-link at-pwd" onClick={toggleWantPasswordReset}>
          Forgot your password?
        </a>
      </p>
    </div>
  ) : null;
  const backToMainForm = props.format === AccountFormFormat.REQUEST_PW_RESET ? (
    <div className="at-signin-link">
      <p>
        {/* TODO: prefer <Button variant="link"> */}
        If you already have an account,
        {' '}
        <a href="#" id="at-signIn" className="at-link at-signin" onClick={toggleWantPasswordReset}>sign in</a>
      </p>
    </div>
  ) : null;
  return (
    <div className="at-form">
      <div className="at-title">
        <h3>{title}</h3>
      </div>
      <div>
        <form id="at-pwd-form" noValidate action="#" method="POST" onSubmit={submitFormCallback}>
          <fieldset>
            {submitState === AccountFormSubmitState.FAILED ? <Alert variant="danger">{errorMessage}</Alert> : null}
            {submitState === AccountFormSubmitState.SUCCESS && successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
            {props.format === AccountFormFormat.LOGIN || props.format === AccountFormFormat.REQUEST_PW_RESET ? emailInput : null}
            {props.format === AccountFormFormat.LOGIN || props.format === AccountFormFormat.ENROLL || props.format === AccountFormFormat.RESET_PWD ? pwInput : null}
            {pwResetOptionComponent}
            {props.format === AccountFormFormat.ENROLL ? enrollmentFields : null}
            <Button id="at-btn" size="lg" variant="outline-secondary" block className="at-btn submit" type="submit" disabled={submitting}>
              {buttonText}
            </Button>
            {backToMainForm}
          </fieldset>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;
