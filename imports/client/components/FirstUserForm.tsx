import { Meteor } from 'meteor/meteor';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';

enum SubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  ERROR = 'error',
}

interface FirstUserFormProps {
}

interface FirstUserFormState {
  email: string;
  password: string;
  submitState: SubmitState;
  submitError: string;
}

class FirstUserForm extends React.Component<FirstUserFormProps, FirstUserFormState> {
  constructor(props: FirstUserFormProps) {
    super(props);
    this.state = {
      email: '',
      password: '',
      submitState: SubmitState.IDLE,
      submitError: '',
    };
  }

  onEmailChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      email: e.currentTarget.value,
    });
  };

  onPasswordChange: FormControlProps['onChange'] = (e) => {
    this.setState({
      password: e.currentTarget.value,
    });
  };

  onSubmit = (e: React.FormEvent<any>) => {
    e.preventDefault();

    const email = this.state.email.trim();
    const password = this.state.password;

    if (email.length === 0 || password.length === 0) {
      this.setState({
        submitState: SubmitState.ERROR,
        submitError: 'Must provide both an email and password',
      });
    } else {
      this.setState({
        submitState: SubmitState.SUBMITTING,
      });
      Meteor.call('provisionFirstUser', email, password, (err?: Error) => {
        if (err) {
          this.setState({
            submitState: SubmitState.ERROR,
            submitError: err.message,
          });
        } else {
          // Success!  Do login.
          Meteor.loginWithPassword(email, password, (error?: Error) => {
            if (error) {
              this.setState({
                submitState: SubmitState.ERROR,
                submitError: error.message,
              });
            } else {
              // We've logged in. We should get redirected to /hunts by the
              // AuthenticatedRoute that's rendering us.
            }
          });
        }
      });
    }
  };

  dismissAlert = () => {
    this.setState({
      submitState: SubmitState.IDLE,
    });
  };

  render() {
    const shouldDisableForm = this.state.submitState === SubmitState.SUBMITTING;
    return (
      <form onSubmit={this.onSubmit}>
        <h1>Create first user</h1>
        <p>This user will have server admin and operator privileges.</p>
        {this.state.submitState === SubmitState.SUBMITTING ? <Alert variant="info">Creating first user...</Alert> : null}
        {this.state.submitState === SubmitState.SUCCESS ? <Alert variant="success" dismissible onClose={this.dismissAlert}>Created user.</Alert> : null}
        {this.state.submitState === SubmitState.ERROR ? (
          <Alert variant="danger" dismissible onClose={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.submitError}
          </Alert>
        ) : null}
        <FormGroup>
          <FormLabel htmlFor="jr-first-user-email">
            Email
          </FormLabel>
          <FormControl
            id="jr-first-user-email"
            type="text"
            value={this.state.email}
            disabled={shouldDisableForm}
            onChange={this.onEmailChange}
          />
        </FormGroup>
        <FormGroup>
          <FormLabel htmlFor="jr-first-user-password">
            Password
          </FormLabel>
          <FormControl
            id="jr-first-user-password"
            type="password"
            value={this.state.password}
            disabled={shouldDisableForm}
            onChange={this.onPasswordChange}
          />
        </FormGroup>
        <Button variant="primary" type="submit" disabled={shouldDisableForm} onSubmit={this.onSubmit}>
          Create first user
        </Button>
      </form>
    );
  }
}

export default FirstUserForm;
