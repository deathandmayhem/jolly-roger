import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
      <Navbar fixed="top" bg="light" variant="light">
        <NavbarBrand>
          <Link to="/">
            <img src="/asset/brand.png" alt="Jolly Roger logo" srcSet="/asset/brand.png 1x, /asset/brand@2x.png 2x" />
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
        <Nav className="ml-auto">
          <Dropdown as={NavItem}>
            <DropdownToggle id="profileDropdown" as={NavLink}>
              <FontAwesomeIcon icon={faUser} />
              {' '}
              <span className="nav-username">{this.props.displayName}</span>
            </DropdownToggle>
            <DropdownMenu alignRight>
              <RRBS.LinkContainer to={`/users/${this.props.userId}`}>
                <DropdownItem eventKey="1">My Profile</DropdownItem>
              </RRBS.LinkContainer>
              <DropdownItem
                eventKey="2"
                href="https://github.com/deathandmayhem/jolly-roger/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report an issue
              </DropdownItem>
              <DropdownItem eventKey="3" onSelect={this.logout}>Sign out</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </Nav>
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
