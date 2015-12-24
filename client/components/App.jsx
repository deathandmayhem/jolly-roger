const BS = ReactBootstrap;
const {Link} = ReactRouter;

App = React.createClass({
  propTypes: {
    history: React.PropTypes.object,
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

        <ConnectionStatus/>

        <div style={{position: "absolute", top: "70", bottom: "0", left: "0", right: "0"}}>
          {this.props.children}
        </div>
      </div>
    );
  },
});
