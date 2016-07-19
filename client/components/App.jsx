import { Meteor } from 'meteor/meteor';
import React from 'react';
import BS from 'react-bootstrap';
import RRBS from 'react-router-bootstrap';
import { Link } from 'react-router';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { ConnectionStatus } from '/imports/client/components/ConnectionStatus.jsx';
import { NotificationCenter } from '/imports/client/components/NotificationCenter.jsx';
// TODO: ReactMeteorData

SharedNavbar = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  getMeteorData() {
    const userId = Meteor.userId();
    const profileSub = this.context.subs.subscribe('mongo.profiles', {_id: userId});
    const profile = Models.Profiles.findOne(userId);
    const displayName = profileSub.ready() ? profile && profile.displayName || '<no name given>' : 'loading...';
    return {
      userId,
      displayName,
    };
  },

  logout() {
    Meteor.logout();
  },

  render() {
    return (
      <BS.Navbar fixedTop>
        <BS.Navbar.Header>
          <BS.Navbar.Brand>
            <RRBS.LinkContainer to='/'>
              <img src="/images/brand.png"/>
            </RRBS.LinkContainer>
          </BS.Navbar.Brand>
        </BS.Navbar.Header>
        <BS.Navbar.Collapse>
          {/* TODO: Construct some sort of breadcrumbs here? */}
          <BS.Nav>
            <RRBS.LinkContainer to='/hunts'>
              <BS.NavItem>
                Hunts
              </BS.NavItem>
            </RRBS.LinkContainer>
            <RRBS.LinkContainer to='/users/'>
              <BS.NavItem>
                Hunters
              </BS.NavItem>
            </RRBS.LinkContainer>
          </BS.Nav>
          <BS.Nav pullRight>
            <BS.DropdownButton id='profileDropdown' bsStyle='default' title={this.data.displayName} navbar={true} className="navbar-btn">
              <RRBS.LinkContainer to={`/users/${this.data.userId}`}>
                <BS.MenuItem eventKey="1">My Profile</BS.MenuItem>
              </RRBS.LinkContainer>
              <BS.MenuItem eventKey="2" onSelect={this.logout}>Sign out</BS.MenuItem>
            </BS.DropdownButton>
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
        <NotificationCenter/>
        <SharedNavbar {...this.props} />
        <div style={{position: 'fixed', top: '50px', left: '0px', right: '0px', zIndex: '1'}}>
          <ConnectionStatus/>
        </div>
        <div style={{position: 'fixed', top: '50px', bottom: '0px', left: '0px', right: '0px'}}>
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
        <NotificationCenter/>
        <SharedNavbar {...this.props} />
        <div className="container" style={{paddingTop: '70px'}}>
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
    let leafRoute = routes[routes.length - 1];
    let layout = leafRoute.component.desiredLayout;
    return (
      layout === 'fullscreen' ?
          <FullscreenLayout {...this.props}/> :
          <ScrollableLayout {...this.props}/>
    );
  },
});
