import { Meteor } from 'meteor/meteor';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import Row from 'react-bootstrap/Row';
import { withRouter, WithRouterProps } from 'react-router';

interface UserInvitePageProps extends WithRouterProps {
  params: {huntId: string};
}

interface UserInvitePageState {
  submitting: boolean;
  error?: Meteor.Error | null;
  email: string;
}

class UserInvitePage extends React.Component<UserInvitePageProps, UserInvitePageState> {
  constructor(props: UserInvitePageProps) {
    super(props);
    this.state = {
      submitting: false,
      error: null,
      email: '',
    };
  }

  onEmailChanged: FormControlProps['onChange'] = (e) => {
    this.setState({
      email: e.currentTarget.value,
    });
  };

  onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    this.setState({ submitting: true });
    Meteor.call('addToHunt', this.props.params.huntId, this.state.email, (error?: Meteor.Error) => {
      this.setState({ submitting: false });
      if (error) {
        this.setState({ error });
      } else {
        this.props.router.push(`/hunts/${this.props.params.huntId}`);
      }
    });
  };

  renderError = () => {
    if (this.state.error) {
      return (
        <Alert variant="danger" className="text-center">
          <p>{this.state.error.reason}</p>
        </Alert>
      );
    }

    return undefined;
  };

  render() {
    return (
      <div>
        <h1>Send an invite</h1>

        <p>
          Invite someone to join this hunt. They&apos;ll get an email with instructions (even if
          they already have a Jolly Roger account)
        </p>

        <Row>
          <Col md={8}>
            {this.renderError()}

            <form onSubmit={this.onSubmit} className="form-horizontal">
              <FormGroup>
                <FormLabel
                  htmlFor="jr-invite-email"
                  className="col-md-3"
                >
                  E-mail address
                </FormLabel>
                <div className="col-md-9">
                  <FormControl
                    id="jr-invite-email"
                    type="email"
                    value={this.state.email}
                    onChange={this.onEmailChanged}
                    disabled={this.state.submitting}
                  />
                </div>
              </FormGroup>

              <FormGroup>
                <div className="col-md-offset-3 col-md-9">
                  <Button type="submit" variant="primary" disabled={this.state.submitting}>
                    Send invite
                  </Button>
                </div>
              </FormGroup>
            </form>
          </Col>
        </Row>
      </div>
    );
  }
}

export default withRouter(UserInvitePage);
