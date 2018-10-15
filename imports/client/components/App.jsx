import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import React from 'react';
import BS from 'react-bootstrap';
import { Link } from 'react-router';
import RRBS from 'react-router-bootstrap';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import JRPropTypes from '../JRPropTypes.js';
import ConnectionStatus from './ConnectionStatus.jsx';
import NotificationCenter from './NotificationCenter.jsx';
import { navAggregatorType } from './NavAggregator.jsx';

const SharedNavbar = React.createClass({
  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const userId = Meteor.userId();
    const profileSub = this.context.subs.subscribe('mongo.profiles', { _id: userId });
    const profile = Models.Profiles.findOne(userId);
    const displayName = profileSub.ready() ?
        ((profile && profile.displayName) || '<no name given>') : 'loading...';
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
      <BS.Navbar fixedTop fluid>
        <BS.Navbar.Header>
          <BS.Navbar.Brand>
            <Link to="/">
              <img src="/images/brand.png" alt="Jolly Roger logo" />
            </Link>
          </BS.Navbar.Brand>
          <this.context.navAggregator.NavBar />
          <BS.Navbar.Toggle />
        </BS.Navbar.Header>
        <BS.Navbar.Collapse>
          <BS.Nav pullRight>
            <BS.NavDropdown
              id="profileDropdown"
              title={this.data.displayName}
            >
              <RRBS.LinkContainer to={`/users/${this.data.userId}`}>
                <BS.MenuItem eventKey="1">My Profile</BS.MenuItem>
              </RRBS.LinkContainer>
              <BS.MenuItem eventKey="2" href="mailto:dfa-web@mit.edu">
                Report an issue
              </BS.MenuItem>
              <BS.MenuItem eventKey="3" onSelect={this.logout}>Sign out</BS.MenuItem>
            </BS.NavDropdown>
          </BS.Nav>
        </BS.Navbar.Collapse>
      </BS.Navbar>
    );
  },
});

// TODO: clean this up and dedupe navbar stuff when you figure out breadcrumbs
const FullscreenLayout = React.createClass({
  propTypes: {
    children: PropTypes.node,
  },

  render() {
    const { children, ...props } = this.props;
    return (
      <div>
        <NotificationCenter />
        <SharedNavbar {...props} />
        <div className="connection-status-fullscreen">
          <ConnectionStatus />
        </div>
        <div className="app-content-fullscreen">
          {children}
        </div>
      </div>
    );
  },
});

const ScrollableLayout = React.createClass({
  propTypes: {
    children: PropTypes.node,
  },

  render() {
    const { children, ...props } = this.props;
    return (
      <div>
        <NotificationCenter />
        <SharedNavbar {...props} />
        <div className="container-fluid app-content-scrollable">
          <ConnectionStatus />
          {children}
        </div>
      </div>
    );
  },
});

const App = React.createClass({
  propTypes: {
    routes: PropTypes.array,
  },
  render() {
    // Hack: see if the leaf route wants the fullscreen layout.
    const { routes, ...props } = this.props;
    const leafRoute = routes[routes.length - 1];
    const layout = leafRoute.component.desiredLayout;
    return (
      layout === 'fullscreen' ?
        <FullscreenLayout {...props} /> :
        <ScrollableLayout {...props} />
    );
  },
});

export default App;
