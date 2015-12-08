const BS = ReactBootstrap;
const {
  Link,
  Redirect,
  Route,
  Router,
} = ReactRouter;

const history = ReactRouter.history.useQueries(ReactRouter.history.createHistory)();

App = React.createClass({
  mixins: [ReactRouter.History, ReactMeteorData],

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
            in {{timeToRetry}}s. Your pending changes will be pushed to
            the server when we reconnect. <a onClick={Meteor.reconnect}>retry now</a>
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
                <img src="/images/brand.png" />
              </Link>
            </BS.Navbar.Brand>
          </BS.Navbar.Header>
          <BS.Navbar.Collapse>
            {/* TODO: Construct some sort of breadcrumbs here? */}
            <BS.Nav>
              <li className={this.history.isActive('/hunts', undefined, true) && 'active'}>
                <Link to="/hunts">
                  All hunts
                </Link>
              </li>
            </BS.Nav>
            <BS.Nav pullRight>
              <li>
                <BS.Button bsStyle="default" className="navbar-btn">
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

AuthenticatedRoutes = React.createClass({
  render() {
    return (
      <Router history={history}>
        <Redirect from="/" to="hunts"/>
        <Route path="/" component={App}>
          <Route path="hunts" component={HuntList}/>
        </Route>
      </Router>
    );
  },
});

$(document).ready(function() {
  ReactDOM.render(<AuthenticatedRoutes/>, document.getElementById('jr-container'));
});
