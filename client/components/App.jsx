const BS = ReactBootstrap;
const {Link} = ReactRouter;

SharedNavbar = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    return {
      userId: Meteor.userId(),
    };
  },

  render() {
    return (
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
            <li className={this.props.history.isActive('/hunts', undefined, true) && 'active'}>
              <Link to="/hunts">
                All hunts
              </Link>
            </li>
            <li className={this.props.history.isActive('/users/invite', undefined, true) && 'active'}>
              <Link to="/users/invite">
                Invite someone
              </Link>
            </li>
            {/* TODO: profile should really be an item in a dropdown
                 with user's name so should the sign out button so
                 should invite someone */}
            <li className={this.props.history.isActive(`/users/${this.data.userId}`, undefined, true) && 'active'}>
              <Link to={`/users/${this.data.userId}`}>
                My profile
              </Link>
            </li>
          </BS.Nav>
          <BS.Nav pullRight>
            <BlazeToReact blazeTemplate="atNavButton"/>
          </BS.Nav>
        </BS.Navbar.Collapse>
      </BS.Navbar>
    );
  },
});

// TODO: clean this up and dedupe navbar stuff when you figure out breadcrumbs
FullscreenLayout = React.createClass({
  render() {
    return (
      <div>
        <SharedNavbar {...this.props} />
        <div style={{position: 'fixed', top: '50', left: '0', right: '0', zIndex: '1'}}>
          <ConnectionStatus/>
        </div>
        <div style={{position: 'fixed', top: '50', bottom: '0', left: '0', right: '0'}}>
          {this.props.children}
        </div>
      </div>
    );
  },
});

ScrollableLayout = React.createClass({
  render() {
    return (
      <div>
        <SharedNavbar {...this.props} />
        <div className="container" style={{paddingTop: 70}}>
          <ConnectionStatus/>
          {this.props.children}
        </div>
      </div>
    );
  },
});

App = React.createClass({
  propTypes: {
    history: React.PropTypes.object,
  },
  render() {
    // Hack: see if the leaf route wants the fullscreen layout.
    let routes = this.props.routes;
    let leafRoute = routes[routes.length-1];
    let layout = leafRoute.component.desiredLayout;
    return (
      layout === 'fullscreen' ?
          <FullscreenLayout {...this.props}/> :
          <ScrollableLayout {...this.props}/>
    );
  },
});
