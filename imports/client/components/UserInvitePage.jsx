import { Meteor } from 'meteor/meteor';
import React from 'react';
import BS from 'react-bootstrap';

const UserInvitePage = React.createClass({
  propTypes: {
    history: React.PropTypes.object,
  },

  getInitialState() {
    return {error: null};
  },

  onSubmit(e) {
    e.preventDefault();
    Meteor.call('sendInvite', this.refs.email.getValue(), (error) => {
      if (error) {
        this.setState({error});
      } else {
        this.props.history.pushState(null, '/');
      }
    });
  },

  errorDescription() {
    switch (this.state.error.reason) {
      case 'Email already exists.':
        return 'We\'ve already created an account for this user. Maybe they should reset their password?';
      default:
        return this.state.error.reason;
    }
  },

  renderError() {
    if (this.state.error) {
      return (
        <BS.Alert bsStyle="danger" className="text-center">
          <p>{this.errorDescription()}</p>
        </BS.Alert>
      );
    }
  },

  render() {
    return (
      <div>
        <h1>Send an invite</h1>

        <p>Create a new account for someone on the team by emailing
        them an invitation to Jolly Roger</p>

        <BS.Row>
          <BS.Col md={8}>
            {this.renderError()}

            <form onSubmit={this.onSubmit} className="form-horizontal">
              <BS.Input
                  id="jr-invite-email"
                  ref="email"
                  type="email"
                  label="E-mail address"
                  labelClassName="col-md-3"
                  wrapperClassName="col-md-9" />
              <BS.ButtonInput
                  type="submit"
                  bsStyle="primary"
                  wrapperClassName="col-md-offset-3 col-md-9">
                Send invite
              </BS.ButtonInput>
            </form>
          </BS.Col>
        </BS.Row>
      </div>
    );
  },
});

export { UserInvitePage };
