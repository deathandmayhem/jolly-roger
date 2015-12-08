const BS = ReactBootstrap;
const {
  Link,
  Redirect,
  Route,
  Router,
} = ReactRouter;

const history = ReactRouter.history.useQueries(ReactRouter.history.createHistory)();

App = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    return {
      meteorStatus: Meteor.status(),
    };
  },

  connectionStatus() {
    switch (this.data.meteorStatus.status) {
      case 'connecting':
        return (
          <BS.Alert bsStyle="warning">
            Trying to reconnect to Jolly Roger...
          </BS.Alert>
        );
      case 'failed':
        return (
          <BS.Alert bsStyle="danger">
            <strong>Oh no!</strong> Unable to connect to Jolly Roger:
            {self.data.meteorStatus.reason}
          </BS.Alert>
        );
      case 'waiting':
        return (
          <BS.Alert bsStyle="warning">
            We can't connect to Jolly Roger right now. We'll try again
            in {self.data.meteorStatus.timeToRetry}s. Your pending
            changes will be pushed to the server when we
            reconnect. <a onClick={Meteor.reconnect}>retry now</a>
          </BS.Alert>
        );
      case 'offline':
        return (
          <BS.Alert bsStyle="warning">
            <strong>Warning!</strong> Currently not connected to Jolly
            Roger server. Changes will be synced when you
            reconnect. <a onClick={Meteor.reconnect}>reconnect now</a>
          </BS.Alert>
        );
    }
  },

  render() {
    return (
      <div>
        <BS.Navbar fixedTop>
          <BS.Navbar.Header>
            <BS.Navbar.Brand>
              <Link to="/">
                <img src="/images/brand.png"/>
              </Link>
            </BS.Navbar.Brand>
          </BS.Navbar.Header>
          <BS.Navbar.Collapse>
            {/* TODO: Construct some sort of breadcrumbs here? */}
            <BS.Nav>
              <li className={this.props.location.pathname == '/hunts' && 'active'}>
                <Link to="/hunts">
                  All hunts
                </Link>
              </li>
            </BS.Nav>
            <BS.Nav pullRight>
              <li>
                <BS.Button bsStyle="default" className="navbar-btn" onClick={Meteor.logout}>
                  Sign out
                </BS.Button>
              </li>
            </BS.Nav>
          </BS.Navbar.Collapse>
        </BS.Navbar>

        <div className="container">
          {this.connectionStatus()}

          {this.props.children}
        </div>
      </div>
    );
  },
});

Login = React.createClass({
  getInitialState() {
    return {error: null};
  },

  onSubmit(e) {
    e.preventDefault();
    Meteor.loginWithPassword(
      this.refs.email.getValue(),
      this.refs.password.getValue(),
      (error) => {
        this.setState({error});
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
      <div className="container">
        <BS.Jumbotron id="jr-login">
          <BS.Image src="/images/hero.png" className="center-block" responsive/>
          <div className="container">
            <BS.Row>
              <BS.Col md={6} mdOffset={3}>
                <h3>Jolly Roger: Death and Mayhem Virtual HQ</h3>
                {this.renderError()}
                <form onSubmit={this.onSubmit}>
                  <fieldset>
                  <BS.Input
                      ref="email"
                      name="email"
                      label="Email"
                      placeholder="Email"
                      type="email"/>
                  <BS.Input
                      ref="password"
                      name="password"
                      label="Password"
                      placeholder="Password"
                      type="password"/>
                  <BS.ButtonInput
                      type="submit"
                      bsSize="large"
                      bsStyle="default"
                      block>
                    Sign In
                  </BS.ButtonInput>
                  </fieldset>
                </form>
              </BS.Col>
            </BS.Row>
          </div>
        </BS.Jumbotron>
      </div>
    );
  },
});

Routes = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    return {user: Meteor.user()};
  },

  render() {
    if (this.data.user) {
      /* Authenticated routes */
      return (
        <Router history={history}>
          <Redirect from="/" to="hunts"/>
          <Route path="/" component={App}>
            <Route path="hunts" component={HuntList}/>
          </Route>
        </Router>
      );
    } else {
      /* Unauthenticated routes */
      return <Login/>;
    };
  },
});

$(document).ready(function() {
  ReactDOM.render(<Routes/>, document.getElementById('jr-container'));
});
