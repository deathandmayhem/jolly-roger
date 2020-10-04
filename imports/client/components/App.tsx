import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import BreadcrumbItem from 'react-bootstrap/BreadcrumbItem';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownItem from 'react-bootstrap/DropdownItem';
import DropdownMenu from 'react-bootstrap/DropdownMenu';
import DropdownToggle from 'react-bootstrap/DropdownToggle';
import Nav from 'react-bootstrap/Nav';
import NavItem from 'react-bootstrap/NavItem';
import NavLink from 'react-bootstrap/NavLink';
import Navbar from 'react-bootstrap/Navbar';
import NavbarBrand from 'react-bootstrap/NavbarBrand';
import NavbarCollapse from 'react-bootstrap/NavbarCollapse';
import NavbarToggle from 'react-bootstrap/NavbarToggle';
import { BreadcrumbsConsumer } from 'react-breadcrumbs-context';
import { RouteComponentProps } from 'react-router';
import * as RRBS from 'react-router-bootstrap';
import { Link } from 'react-router-dom';
import Profiles from '../../lib/models/profiles';
import ConnectionStatus from './ConnectionStatus';
import NotificationCenter from './NotificationCenter';

interface AppNavbarProps extends RouteComponentProps {
  userId: string;
  displayName: string;
}

class AppNavbar extends React.Component<AppNavbarProps> {
  logout = () => {
    // Logout, then immediately redirect to the login page
    Meteor.logout(() => {
      this.props.history.replace({
        pathname: '/login',
      });
    });
  };

  render() {
    return (
      <Navbar fixed="top" expand="md" bg="light" variant="light">
        <NavbarBrand>
          <Link to="/">
            <img src="/images/brand.png" alt="Jolly Roger logo" srcSet="/images/brand.png 1x, /images/brand@2x.png 2x" />
          </Link>
        </NavbarBrand>
        <BreadcrumbsConsumer>
          {({ crumbs }) => {
            return (
              <Breadcrumb className="nav-breadcrumbs mr-auto">
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
                      <RRBS.LinkContainer key={crumb.path} to={crumb.path}>
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
          <Nav className="ml-auto">
            <Dropdown as={NavItem}>
              <DropdownToggle id="profileDropdown" as={NavLink}>{this.props.displayName}</DropdownToggle>
              <DropdownMenu alignRight>
                <RRBS.LinkContainer to={`/users/${this.props.userId}`}>
                  <DropdownItem eventKey="1">My Profile</DropdownItem>
                </RRBS.LinkContainer>
                <DropdownItem eventKey="2" href="mailto:dfa-web@mit.edu">
                  Report an issue
                </DropdownItem>
                <DropdownItem eventKey="3" onSelect={this.logout}>Sign out</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </Nav>
        </NavbarCollapse>
      </Navbar>
    );
  }
}

const AppNavbarContainer = withTracker((_props: RouteComponentProps) => {
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

interface AppProps extends RouteComponentProps {
  children: React.ReactNode;
}

class App extends React.Component<AppProps> {
  render() {
    const { children, ...routeComponentProps } = this.props;
    return (
      <div>
        <NotificationCenter />
        <AppNavbarContainer {...routeComponentProps} />
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
