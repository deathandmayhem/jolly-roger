import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import Row from 'react-bootstrap/Row';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import { RouteComponentProps } from 'react-router';

interface UserInvitePageParams {
  huntId: string;
}

interface UserInvitePageWithRouterParams extends RouteComponentProps<UserInvitePageParams> {
}

interface UserInvitePageProps extends UserInvitePageWithRouterParams {
  canBulkInvite: boolean;
}

interface UserInvitePageState {
  submitting: boolean;
  error?: Meteor.Error | null;
  email: string;
  bulkEmails: string;
  bulkError?: Meteor.Error | null;
}

class UserInvitePage extends React.Component<UserInvitePageProps, UserInvitePageState> {
  constructor(props: UserInvitePageProps) {
    super(props);
    this.state = {
      submitting: false,
      error: null,
      email: '',
      bulkEmails: '',
      bulkError: null,
    };
  }

  onEmailChanged: FormControlProps['onChange'] = (e) => {
    this.setState({
      email: e.currentTarget.value,
    });
  };

  onBulkEmailsChanged: FormControlProps['onChange'] = (e) => {
    this.setState({
      bulkEmails: e.currentTarget.value,
    });
  }

  onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    this.setState({ submitting: true });
    Meteor.call('addToHunt', this.props.match.params.huntId, this.state.email, (error?: Meteor.Error) => {
      this.setState({ submitting: false });
      if (error) {
        this.setState({ error });
      } else {
        this.props.history.push(`/hunts/${this.props.match.params.huntId}`);
      }
    });
  };

  onBulkSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    this.setState({ submitting: true, bulkError: null });
    const emails = this.state.bulkEmails.split('\n');
    Meteor.call('bulkAddToHunt', this.props.match.params.huntId, emails, (error?: Meteor.Error) => {
      this.setState({ submitting: false });
      if (error) {
        this.setState({ bulkError: error });
      } else {
        this.setState({ bulkEmails: '' });
      }
    });
  }

  renderError = () => {
    if (this.state.error) {
      return (
        <Alert variant="danger">
          <p>{this.state.error.reason}</p>
        </Alert>
      );
    }

    return undefined;
  };

  renderBulkError = () => {
    if (this.state.bulkError) {
      return (
        <Alert variant="danger">
          <p style={{ whiteSpace: 'pre-wrap' }}>{this.state.bulkError.reason}</p>
        </Alert>
      );
    }

    return undefined;
  };

  renderBulkInvite = () => {
    if (!this.props.canBulkInvite) {
      return null;
    }

    return (
      <div>
        <h2>Bulk invite</h2>

        {this.renderBulkError()}

        <form onSubmit={this.onBulkSubmit} className="form-horizontal">
          <FormGroup controlId="jr-invite-bulk">
            <FormLabel>
              Email addresses (one per line)
            </FormLabel>
            <FormControl
              as="textarea"
              rows={10}
              value={this.state.bulkEmails}
              onChange={this.onBulkEmailsChanged}
            />
          </FormGroup>

          <FormGroup>
            <Button type="submit" variant="primary" disabled={this.state.submitting}>
              Send bulk invites
            </Button>
          </FormGroup>
        </form>
      </div>
    );
  }

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
              <FormGroup as={Row}>
                <FormLabel
                  htmlFor="jr-invite-email"
                  column
                  md={3}
                >
                  E-mail address
                </FormLabel>
                <Col md={9}>
                  <FormControl
                    id="jr-invite-email"
                    type="email"
                    value={this.state.email}
                    onChange={this.onEmailChanged}
                    disabled={this.state.submitting}
                  />
                </Col>
              </FormGroup>

              <FormGroup>
                <Col md={{ offset: 3, span: 9 }}>
                  <Button type="submit" variant="primary" disabled={this.state.submitting}>
                    Send invite
                  </Button>
                </Col>
              </FormGroup>
            </form>

            {this.renderBulkInvite()}
          </Col>
        </Row>
      </div>
    );
  }
}

const crumb = withBreadcrumb(({ match }: UserInvitePageWithRouterParams) => {
  return { title: 'Invite', path: `/hunts/${match.params.huntId}/hunters/invite` };
});
const tracker = withTracker((_params: UserInvitePageWithRouterParams) => {
  const canBulkInvite = Roles.userHasPermission(Meteor.userId(), 'hunt.bulkJoin');
  return { canBulkInvite };
});

const UserInvitePageContainer = crumb(tracker(UserInvitePage));

export default UserInvitePageContainer;
