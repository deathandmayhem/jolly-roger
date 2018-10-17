import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';

/* eslint-disable max-len, jsx-a11y/href-no-hash, jsx-a11y/anchor-is-valid, jsx-a11y/label-has-associated-control, jsx-a11y/label-has-for */

const AccountForm = React.createClass({
  propTypes: {
    format: PropTypes.string,
    onFormatChange: PropTypes.func,
    token: PropTypes.string,
  },
  getInitialState() {
    return {
      submitState: 'idle',
      errorMessage: '',
      successMessage: '',
      email: '',
      password: '',
      displayName: '',
      phoneNumber: '',
    };
  },

  setEmail(event) {
    this.setState({
      email: event.target.value,
    });
  },

  setPassword(event) {
    this.setState({
      password: event.target.value,
    });
  },

  setDisplayName(event) {
    this.setState({
      displayName: event.target.value,
    });
  },

  setPhoneNumber(event) {
    this.setState({
      phoneNumber: event.target.value,
    });
  },

  tryLogin() {
    this.setState({
      submitState: 'submitting',
    });
    Meteor.loginWithPassword(this.state.email, this.state.password, (error) => {
      if (error) {
        this.setState({
          submitState: 'failed',
          errorMessage: error.message,
        });
      } else {
        this.setState({
          submitState: 'success',
          successMessage: 'Logged in successfully.',
        });
      }
    });
  },

  tryPasswordReset() {
    this.setState({
      submitState: 'submitting',
    });
    Accounts.forgotPassword({ email: this.state.email }, (error) => {
      if (error) {
        this.setState({
          submitState: 'failed',
          errorMessage: error.message,
        });
      } else {
        this.setState({
          submitState: 'success',
          successMessage: 'Password reset email sent.',
        });
      }
    });
  },

  tryCompletePasswordReset() {
    Accounts.resetPassword(this.props.token, this.state.password, (error) => {
      if (error) {
        this.setState({
          submitState: 'failed',
          errorMessage: error.message,
        });
      } else {
        this.setState({
          submitState: 'success',
          successMessage: 'Password reset successfully',
        });
      }
    });
  },

  tryEnroll() {
    const newProfile = {
      displayName: this.state.displayName,
      phoneNumber: this.state.phoneNumber,
      slackHandle: '',
    };

    this.setState({
      submitState: 'submitting',
    });

    Accounts.resetPassword(this.props.token, this.state.password, (error) => {
      if (error) {
        this.setState({
          submitState: 'failed',
          errorMessage: error.message,
        });
      } else {
        Meteor.call('saveProfile', newProfile, (innerError) => {
          if (innerError) {
            // This user will have to set their profile manually later.  Oh well.
            this.setState({
              submitState: 'failed',
              errorMessage: innerError.message,
            });
          } else {
            this.setState({
              submitState: 'success',
              successMessage: 'Created account successfully',
            });
          }
        });
      }
    });
  },

  submitForm(event) {
    event.preventDefault();
    const format = this.props.format || 'login';
    if (format === 'login') {
      this.tryLogin();
    } else if (format === 'requestPwReset') {
      this.tryPasswordReset();
    } else if (format === 'enroll') {
      this.tryEnroll();
    } else if (format === 'resetPwd') {
      this.tryCompletePasswordReset();
    }
  },

  toggleWantPasswordReset(event) {
    event.preventDefault();
    if (this.props.onFormatChange) {
      this.props.onFormatChange();
    }
  },

  render() {
    // I'm mimicking the DOM used by AccountTemplates for this form so I can reuse their CSS.  It
    // would probably be good to refactor this to use ReactBootstrap/additional styles directly and
    // drop AccountTemplates entirely.
    const submitting = this.state.submitState === 'submitting';
    const format = this.props.format || 'login';
    const title = {
      login: 'Jolly Roger: Death and Mayhem Virtual HQ',
      enroll: 'Create an Account',
      requestPwReset: 'Reset your password',
      resetPwd: 'Reset your password',
    }[format];

    const buttonText = {
      login: 'Sign In',
      enroll: 'Register',
      requestPwReset: 'Email Reset Link',
      resetPwd: 'Set Password',
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
    const pwResetOptionComponent = (
      <div className="at-pwd-link">
        <p>
          {/* TODO: prefer <Button bsStyle="link"> */}
          <a href="#" id="at-forgotPwd" className="at-link at-pwd" onClick={this.toggleWantPasswordReset}>
            Forgot your password?
          </a>
        </p>
      </div>
    );
    const backToMainForm = (
      <div className="at-signin-link">
        <p>
          {/* TODO: prefer <Button bsStyle="link"> */}
          If you already have an account,
          {' '}
          <a href="#" id="at-signIn" className="at-link at-signin" onClick={this.toggleWantPasswordReset}>sign in</a>
        </p>
      </div>
    );
    return (
      <div className="at-form">
        <div className="at-title">
          <h3>{title}</h3>
        </div>
        <div>
          <form id="at-pwd-form" noValidate="" action="#" method="POST" onSubmit={this.submitForm}>
            <fieldset>
              {this.state.submitState === 'failed' ? <Alert bsStyle="danger">{this.state.errorMessage}</Alert> : null}
              {this.state.submitState === 'success' && this.state.successMessage ? <Alert bsStyle="success">{this.state.successMessage}</Alert> : null}
              {format === 'login' || format === 'requestPwReset' ? emailInput : null}
              {format === 'login' || format === 'enroll' || format === 'resetPwd' ? pwInput : null}
              {format === 'login' ? pwResetOptionComponent : null}
              {format === 'enroll' ? enrollmentFields : null}
              <button id="at-btn" className="at-btn submit btn btn-lg btn-block btn-default" type="submit" disabled={submitting}>
                {buttonText}
              </button>
              {format === 'requestPwReset' ? backToMainForm : null}
            </fieldset>
          </form>
        </div>
      </div>
    );
  },
});

export default AccountForm;
