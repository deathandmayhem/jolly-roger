const BS = ReactBootstrap;
const {Link} = ReactRouter;

SharedNavbar = React.createClass({
  render () {
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
          </BS.Nav>
          <BS.Nav pullRight>
            <BlazeToReact blazeTemplate="atNavButton"/>
          </BS.Nav>
        </BS.Navbar.Collapse>
      </BS.Navbar>
    );
  }
});

// TODO: clean this up and dedupe navbar stuff when you figure out breadcrumbs
FullscreenLayout = React.createClass({
  render() {
    return (
      <div>
        <SharedNavbar {...this.props} />
        <div style={{position: "fixed", top: "50", left: "0", right: "0", zIndex: "1"}}>
          <ConnectionStatus/>
        </div>
        <div style={{position: "fixed", top: "50", bottom: "0", left: "0", right: "0"}}>
          {this.props.children}
        </div>
      </div>
    );
  }
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
  }
});

App = React.createClass({
  propTypes: {
    history: React.PropTypes.object,
  },
  render() {
    return (
      this.props.children.type.fullscreenLayout ?
          <FullscreenLayout {...this.props}/> :
          <ScrollableLayout {...this.props}/>
    );
  },
});
