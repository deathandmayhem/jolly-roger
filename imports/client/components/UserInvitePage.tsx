import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import Col from 'react-bootstrap/lib/Col';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import Row from 'react-bootstrap/lib/Row';

interface UserInvitePageProps {
  params: {huntId: string};
}

interface UserInvitePageState {
  submitting: boolean;
  error?: Meteor.Error | null;
  email: string;
}

class UserInvitePage extends React.Component<UserInvitePageProps, UserInvitePageState> {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
  };

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  state = {
    submitting: false,
    error: null,
    email: '',
  } as UserInvitePageState;

  onEmailChanged = (e: React.FormEvent<FormControl>) => {
    this.setState({
      email: (e as unknown as React.FormEvent<HTMLInputElement>).currentTarget.value,
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
        this.context.router.push(`/hunts/${this.props.params.huntId}`);
      }
    });
  };

  renderError = () => {
    if (this.state.error) {
      return (
        <Alert bsStyle="danger" className="text-center">
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
                <ControlLabel
                  htmlFor="jr-invite-email"
                  className="col-md-3"
                >
                  E-mail address
                </ControlLabel>
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
                  <Button type="submit" bsStyle="primary" disabled={this.state.submitting}>
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

export default UserInvitePage;
