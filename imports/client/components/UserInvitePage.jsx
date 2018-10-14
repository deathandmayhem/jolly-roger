import { Meteor } from 'meteor/meteor';
import React from 'react';
import BS from 'react-bootstrap';

const UserInvitePage = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    router: React.PropTypes.object.isRequired,
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
        <BS.Alert bsStyle="danger" className="text-center">
          <p>{this.state.error.reason}</p>
        </BS.Alert>
      );
    }

    return undefined;
  },

  render() {
    return (
      <div>
        <h1>Send an invite</h1>

        <p>Invite someone to join this hunt. They'll get an email with instructions (even if they
          already have a Jolly Roger account)
        </p>

        <BS.Row>
          <BS.Col md={8}>
            {this.renderError()}

            <form onSubmit={this.onSubmit} className="form-horizontal">
              <BS.FormGroup>
                <BS.ControlLabel
                  htmlFor="jr-invite-email"
                  className="col-md-3"
                >
                  E-mail address
                </BS.ControlLabel>
                <div className="col-md-9">
                  <BS.FormControl
                    id="jr-invite-email"
                    type="email"
                    value={this.state.email}
                    onChange={this.onEmailChanged}
                  />
                </div>
              </BS.FormGroup>

              <BS.FormGroup>
                <div className="col-md-offset-3 col-md-9">
                  <BS.Button type="submit" bsStyle="primary">
                    Send invite
                  </BS.Button>
                </div>
              </BS.FormGroup>
            </form>
          </BS.Col>
        </BS.Row>
      </div>
    );
  },
});

export default UserInvitePage;
