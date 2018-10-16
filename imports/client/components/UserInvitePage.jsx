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

const UserInvitePage = React.createClass({
  propTypes: {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    router: PropTypes.object.isRequired,
  },

  getInitialState() {
    return {
      error: null,
      email: '',
    };
  },

  onEmailChanged(e) {
    this.setState({
      email: e.currentTarget.value,
    });
  },

  onSubmit(e) {
    e.preventDefault();
    Meteor.call('addToHunt', this.props.params.huntId, this.state.email, (error) => {
      if (error) {
        this.setState({ error });
      } else {
        this.context.router.push(`/hunts/${this.props.params.huntId}`);
      }
    });
  },

  renderError() {
    if (this.state.error) {
      return (
        <Alert bsStyle="danger" className="text-center">
          <p>{this.state.error.reason}</p>
        </Alert>
      );
    }

    return undefined;
  },

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
                  />
                </div>
              </FormGroup>

              <FormGroup>
                <div className="col-md-offset-3 col-md-9">
                  <Button type="submit" bsStyle="primary">
                    Send invite
                  </Button>
                </div>
              </FormGroup>
            </form>
          </Col>
        </Row>
      </div>
    );
  },
});

export default UserInvitePage;
