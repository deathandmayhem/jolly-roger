import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import BreadcrumbItem from 'react-bootstrap/BreadcrumbItem';
import DropdownItem from 'react-bootstrap/DropdownItem';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Navbar from 'react-bootstrap/Navbar';
import NavbarBrand from 'react-bootstrap/NavbarBrand';
import NavbarCollapse from 'react-bootstrap/NavbarCollapse';
import NavbarToggle from 'react-bootstrap/NavbarToggle';
import { BreadcrumbsConsumer } from 'react-breadcrumbs-context';
import { Link } from 'react-router';
import * as RRBS from 'react-router-bootstrap';
import Profiles from '../../lib/models/profiles';
import ConnectionStatus from './ConnectionStatus';
import NotificationCenter from './NotificationCenter';

interface AppNavbarProps {
  userId: string;
  displayName: string;
}

class AppNavbar extends React.Component<AppNavbarProps> {
  logout = () => {
    Meteor.logout();
  };

  render() {
    return (
      <Navbar fixed="top" expand="md" bg="dark" variant="dark">
        <NavbarBrand>
          <Link to="/">
            <img src="/images/brand.png" alt="Jolly Roger logo" srcSet="/images/brand.png 1x, /images/brand@2x.png 2x" />
          </Link>
        </NavbarBrand>
        <BreadcrumbsConsumer>
          {({ crumbs }) => {
            return (
              <Breadcrumb className="nav-breadcrumbs">
                {crumbs.map((crumb, index) => {
                  const last = (index === crumbs.length - 1);
                  if (last) {
                    return (
                      <BreadcrumbItem key={crumb.path} active>
                        {crumb.title}
                      </BreadcrumbItem>
                    );
                  } else {
                    return (
                      <RRBS.LinkContainer key={crumb.path} to={crumb.path} onlyActiveOnIndex>
                        <BreadcrumbItem active={false}>
                          {crumb.title}
                        </BreadcrumbItem>
                      </RRBS.LinkContainer>
                    );
                  }
                })}
              </Breadcrumb>
            );
          }}
        </BreadcrumbsConsumer>
        <NavbarToggle />
        <NavbarCollapse>
          <Nav className="float-right">
            <NavDropdown
              id="profileDropdown"
              title={this.props.displayName}
            >
              <RRBS.LinkContainer to={`/users/${this.props.userId}`}>
                <DropdownItem eventKey="1">My Profile</DropdownItem>
              </RRBS.LinkContainer>
              <DropdownItem eventKey="2" href="mailto:dfa-web@mit.edu">
                Report an issue
              </DropdownItem>
              <DropdownItem eventKey="3" onSelect={this.logout}>Sign out</DropdownItem>
            </NavDropdown>
          </Nav>
        </NavbarCollapse>
      </Navbar>
    );
  }
}

const AppNavbarContainer = withTracker(() => {
  const userId = Meteor.userId()!;
  const profileSub = Meteor.subscribe('mongo.profiles', { _id: userId });
  const profile = Profiles.findOne(userId);
  const displayName = profileSub.ready() ?
    ((profile && profile.displayName) || '<no name given>') : 'loading...';
  return {
    userId,
    displayName,
  };
})(AppNavbar);

interface AppProps {
  children: React.ReactNode;
}

class App extends React.Component<AppProps> {
  render() {
    return (
      <div>
        <NotificationCenter />
        <AppNavbarContainer />
        <div className="connection-status">
          <ConnectionStatus />
        </div>
        <div className="container-fluid">
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default App;
