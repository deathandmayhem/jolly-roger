import { Meteor } from 'meteor/meteor';
import React from 'react';
import BS from 'react-bootstrap';
import RRBS from 'react-router-bootstrap';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { ConnectionStatus } from '/imports/client/components/ConnectionStatus.jsx';
import { NotificationCenter } from '/imports/client/components/NotificationCenter.jsx';

const SharedNavbar = React.createClass({
  contextTypes: {
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const userId = Meteor.userId();
    const profileSub = this.context.subs.subscribe('mongo.profiles', { _id: userId });
    const profile = Models.Profiles.findOne(userId);
    const displayName = profileSub.ready() ?
        (profile && profile.displayName || '<no name given>') : 'loading...';
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
            <RRBS.LinkContainer to="/">
              <img src="/images/brand.png" alt="Jolly Roger logo" />
            </RRBS.LinkContainer>
          </BS.Navbar.Brand>
        </BS.Navbar.Header>
        <BS.Navbar.Collapse>
          {/* TODO: Construct some sort of breadcrumbs here? */}
          <BS.Nav>
            <RRBS.LinkContainer to="/hunts">
              <BS.NavItem>
                Hunts
              </BS.NavItem>
            </RRBS.LinkContainer>
            <RRBS.LinkContainer to="/users/">
              <BS.NavItem>
                Hunters
              </BS.NavItem>
            </RRBS.LinkContainer>
          </BS.Nav>
          <BS.Nav pullRight>
            <BS.DropdownButton
              id="profileDropdown" bsStyle="default" title={this.data.displayName}
              navbar className="navbar-btn"
            >
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
const FullscreenLayout = React.createClass({
  propTypes: {
    children: React.PropTypes.node,
  },

  render() {
    return (
      <div>
        <NotificationCenter />
        <SharedNavbar {...this.props} />
        <div style={{ position: 'fixed', top: '50px', left: '0px', right: '0px', zIndex: '1' }}>
          <ConnectionStatus />
        </div>
        <div style={{ position: 'fixed', top: '50px', bottom: '0px', left: '0px', right: '0px' }}>
          {this.props.children}
        </div>
      </div>
    );
  },
});

const ScrollableLayout = React.createClass({
  propTypes: {
    children: React.PropTypes.node,
  },

  render() {
    return (
      <div>
        <NotificationCenter />
        <SharedNavbar {...this.props} />
        <div className="container" style={{ paddingTop: '70px' }}>
          <ConnectionStatus />
          {this.props.children}
        </div>
      </div>
    );
  },
});

const App = React.createClass({
  propTypes: {
    history: React.PropTypes.object,
    routes: React.PropTypes.array,
  },
  render() {
    // Hack: see if the leaf route wants the fullscreen layout.
    const routes = this.props.routes;
    const leafRoute = routes[routes.length - 1];
    const layout = leafRoute.component.desiredLayout;
    return (
      layout === 'fullscreen' ?
        <FullscreenLayout {...this.props} /> :
        <ScrollableLayout {...this.props} />
    );
  },
});

export { App };
