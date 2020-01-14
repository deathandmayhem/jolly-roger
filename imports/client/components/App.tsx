import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Breadcrumb from 'react-bootstrap/lib/Breadcrumb';
import BreadcrumbItem from 'react-bootstrap/lib/BreadcrumbItem';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import Nav from 'react-bootstrap/lib/Nav';
import NavDropdown from 'react-bootstrap/lib/NavDropdown';
import Navbar from 'react-bootstrap/lib/Navbar';
import NavbarBrand from 'react-bootstrap/lib/NavbarBrand';
import NavbarCollapse from 'react-bootstrap/lib/NavbarCollapse';
import NavbarHeader from 'react-bootstrap/lib/NavbarHeader';
import NavbarToggle from 'react-bootstrap/lib/NavbarToggle';
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
      <Navbar fixedTop fluid>
        <NavbarHeader>
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
        </NavbarHeader>
        <NavbarCollapse>
          <Nav pullRight>
            <NavDropdown
              id="profileDropdown"
              title={this.props.displayName}
            >
              <RRBS.LinkContainer to={`/users/${this.props.userId}`}>
                <MenuItem eventKey="1">My Profile</MenuItem>
              </RRBS.LinkContainer>
              <MenuItem eventKey="2" href="mailto:dfa-web@mit.edu">
                Report an issue
              </MenuItem>
              <MenuItem eventKey="3" onSelect={this.logout}>Sign out</MenuItem>
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

interface RouteComponent {
  desiredLayout?: string;
}

interface AppProps {
  routes: {component: RouteComponent}[];
  children: React.ReactNode;
}

class App extends React.Component<AppProps> {
  render() {
    // Hack: see if the leaf route wants the fullscreen layout.
    const { routes, children } = this.props;
    const leafRoute = routes[routes.length - 1];
    const layout = leafRoute.component.desiredLayout;

    return (
      <div>
        <NotificationCenter />
        <AppNavbarContainer />
        {layout === 'fullscreen' && (
          <div className="connection-status-fullscreen">
            <ConnectionStatus />
          </div>
        )}
        <div className={layout === 'fullscreen' ? 'app-content-fullscreen' : 'container-fluid app-content-scrollable'}>
          {layout !== 'fullscreen' && <ConnectionStatus />}
          {children}
        </div>
      </div>
    );
  }
}

export default App;
