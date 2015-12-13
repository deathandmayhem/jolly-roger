const BS = ReactBootstrap;

UserInvite = React.createClass({
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

  renderError() {
    if (this.state.error) {
      return (
        <BS.Alert bsStyle="danger" className="text-center">
          <p>{this.state.error.reason}</p>
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
