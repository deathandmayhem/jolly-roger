import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import React from 'react';
import BS from 'react-bootstrap';
import { LabelledRadioGroup } from '/imports/client/components/LabelledRadioGroup.jsx';

/* eslint-disable max-len, jsx-a11y/href-no-hash */

const AccountForm = React.createClass({
  propTypes: {
    format: React.PropTypes.string,
    onFormatChange: React.PropTypes.func,
    token: React.PropTypes.string,
  },
  getInitialState() {
    return {
      submitState: 'idle',
      errorMessage: '',
      successMessage: '',
      email: '',
      password: '',
      displayName: '',
      locationDuringHunt: '',
      phoneNumber: '',
      affliation: '',
      localRemote: '',
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

  setLocationDuringHunt(event) {
    this.setState({
      locationDuringHunt: event.target.value,
    });
  },

  setPhoneNumber(event) {
    this.setState({
      phoneNumber: event.target.value,
    });
  },

  setAffiliation(newAffiliation) {
    this.setState({
      affiliation: newAffiliation,
    });
  },

  setLocalRemote(newLocalRemote) {
    this.setState({
      localRemote: newLocalRemote,
    });
  },

  async tryLogin() {
    this.setState({
      submitState: 'submitting',
    });

    const error = await Meteor.loginWithPasswordPromise(this.state.email, this.state.password);
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
  },

  async tryPasswordReset() {
    this.setState({
      submitState: 'submitting',
    });

    const error = await Accounts.forgotPasswordPromise({ email: this.state.email });
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
  },

  async tryCompletePasswordReset() {
    const error = await Accounts.resetPasswordPromise(this.props.token, this.state.password);
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
  },

  async tryEnroll() {
    const newProfile = {
      displayName: this.state.displayName,
      locationDuringHunt: this.state.locationDuringHunt,
      phoneNumber: this.state.phoneNumber,
      slackHandle: '',
      affiliation: this.state.affiliation,
      remote: this.state.localRemote === 'remote',
    };

    this.setState({
      submitState: 'submitting',
    });

    const error = await Accounts.resetPasswordPromise(this.props.token, this.state.password);
    if (error) {
      this.setState({
        submitState: 'failed',
        errorMessage: error.message,
      });
      return;
    }

    const innerError = await Meteor.callPromise('saveProfile', newProfile);
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
          id="at-field-email" className="form-control" type="email" name="at-field-email"
          placeholder="Email" autoCapitalize="none" autoCorrect="off"
          onChange={this.setEmail} disabled={submitting}
        />
        <span className="help-block" hidden />
      </div>
    );
    const pwInput = (
      <div>
        <label className="control-label" htmlFor="at-field-password">Password</label>
        <input
          id="at-field-password" className="form-control" type="password" name="at-field-password"
          placeholder="Password" autoCapitalize="none" autoCorrect="off"
          onChange={this.setPassword} disabled={submitting}
        />
        <span className="help-block" hidden />
      </div>
    );
    const enrollmentFields = [
      <div className="at-input form-group">
        <label className="control-label" htmlFor="at-field-displayname">Full name</label>
        <input
          id="at-field-displayname" className="form-control" type="text"
          name="at-field-displayname" placeholder="Ben Bitdiddle" autoCapitalize="none"
          autoCorrect="off" onChange={this.setDisplayName} disabled={submitting}
        />
        <span className="help-block">For use in chat</span>
      </div>,
      <div className="at-input form-group">
        <label className="control-label" htmlFor="at-field-phonenumber">Phone Number</label>
        <input
          id="at-field-phonenumber" className="form-control" type="tel"
          name="at-field-phonenumber" placeholder="+16173244699" onChange={this.setPhoneNumber}
          disabled={submitting}
        />
        <span className="help-block">
          Optional, but helpful if HQ needs to reach you while you're
          on a runaround or at an event puzzle.
        </span>
      </div>,
      <div className="at-input form-group">
        <LabelledRadioGroup
          header="Affiliation with MIT"
          name="affiliation"
          options={[
            {
              value: 'undergrad',
              label: 'Undergraduate Student',
            }, {
              value: 'grad',
              label: 'Graduate student',
            }, {
              value: 'alum',
              label: 'Alumnus/alumna',
            }, {
              value: 'employee',
              label: 'Faculty/staff',
            }, {
              value: 'other',
              label: 'Other',
            }, {
              value: 'unaffiliated',
              label: 'Unaffiliated',
            },
          ]}
          initialValue={this.state.affiliation}
          help="The hunt organizers ask us for statistics about our team's affiliation."
          onChange={this.setAffiliation}
        />
      </div>,
      <div className="at-input form-group">
        <LabelledRadioGroup
          header="Where are you hunting from?"
          name="location"
          options={[
            {
              value: 'local',
              label: 'At MIT',
            }, {
              value: 'remote',
              label: 'Remote (anywhere else)',
            },
          ]}
          initialValue={this.state.localRemote}
          help="This is useful to the operators, so we know what fraction of our team is local vs. remote."
          onChange={this.setLocalRemote}
        />
        <label className="control-label" htmlFor="at-field-location">
          Specific location during hunt
        </label>
        <input
          id="at-field-location" className="form-control" type="text" name="at-field-location"
          placeholder="MIT, 32-261" onChange={this.setLocationDuringHunt} disabled={submitting}
        />
        <span className="help-block">Optional. More detail on where you (plan to hunt|are hunting) from.</span>
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
          If you already have an account, <a href="#" id="at-signIn" className="at-link at-signin" onClick={this.toggleWantPasswordReset}>sign in</a>
        </p>
      </div>
    );
    return (
      <div className="at-form">
        <div className="at-title">
          <h3>{title}</h3>
        </div>
        <div>
          <form id="at-pwd-form" role="form" noValidate="" action="#" method="POST" onSubmit={this.submitForm}>
            <fieldset>
              {this.state.submitState === 'failed' ? <BS.Alert bsStyle="danger">{this.state.errorMessage}</BS.Alert> : null}
              {this.state.submitState === 'success' && this.state.successMessage ? <BS.Alert bsStyle="success">{this.state.successMessage}</BS.Alert> : null}
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

export { AccountForm };
