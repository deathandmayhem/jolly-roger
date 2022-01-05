import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { faUser } from '@fortawesome/free-solid-svg-icons/faUser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useMemo } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownItem from 'react-bootstrap/DropdownItem';
import DropdownMenu from 'react-bootstrap/DropdownMenu';
import DropdownToggle from 'react-bootstrap/DropdownToggle';
import Nav from 'react-bootstrap/Nav';
import NavItem from 'react-bootstrap/NavItem';
import NavLink from 'react-bootstrap/NavLink';
import Navbar from 'react-bootstrap/Navbar';
import NavbarBrand from 'react-bootstrap/NavbarBrand';
import { useHistory } from 'react-router';
import * as RRBS from 'react-router-bootstrap';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Profiles from '../../lib/models/profiles';
import { useBreadcrumbItems } from '../hooks/breadcrumb';
import lookupUrl from '../lookupUrl';
import ConnectionStatus from './ConnectionStatus';
import NotificationCenter from './NotificationCenter';
import { NavBarHeight } from './styling/constants';
import { mediaBreakpointDown } from './styling/responsive';

interface AppNavbarTracker {
  userId: string;
  displayName: string;
  brandSrc: string;
  brandSrc2x: string;
}

const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  height: ${NavBarHeight};
  flex: 1;
`;

const BreadcrumbList = styled.ol`
  list-style: none;
  display: block;
  max-height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
`;

const BreadcrumbItem = styled.li`
  display: inline;
  text-indent: 0;
  color: #6c757d;

  + li {
    padding-left: 0.5rem;
    &:before {
      content: '/';
      padding-right: 0.5rem;
    }
  }
`;

const NavUsername = styled.span`
  ${mediaBreakpointDown('sm')`
    display: none;
  `}
`;

const Brand = styled.img`
  width: ${NavBarHeight};
  height: ${NavBarHeight};
`;

const AppNavbar = () => {
  const tracker = useTracker<AppNavbarTracker>(() => {
    const userId = Meteor.userId()!;
    const profileSub = Meteor.subscribe('mongo.profiles', { _id: userId });
    const profile = Profiles.findOne(userId);
    const displayName = profileSub.ready() ?
      ((profile && profile.displayName) || '<no name given>') : 'loading...';

    const brandSrc = lookupUrl('brand.png');
    const brandSrc2x = lookupUrl('brand@2x.png');
    return {
      userId,
      displayName,
      brandSrc,
      brandSrc2x,
    };
  }, []);

  const history = useHistory();
  const logout = useCallback(() => {
    // Logout, then immediately redirect to the login page
    Meteor.logout(() => {
      history.replace({
        pathname: '/login',
      });
    });
  }, [history]);

  const crumbs = useBreadcrumbItems();
  const breadcrumbsComponent = useMemo(() => {
    return (
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const last = (index === crumbs.length - 1);
            if (last) {
              return (
                <BreadcrumbItem key={crumb.path} aria-current="page">
                  {crumb.title}
                </BreadcrumbItem>
              );
            } else {
              return (
                <BreadcrumbItem
                  key={crumb.path}
                >
                  <Link to={crumb.path}>
                    {crumb.title}
                  </Link>
                </BreadcrumbItem>
              );
            }
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }, [crumbs]);

  // Note: the .brand class on the <img> ensures that the logo takes up the
  // correct amount of space in the top bar even if we haven't actually picked
  // a nonempty source for it yet.
  return (
    <Navbar sticky="top" bg="light" variant="light" className="px-0 py-0">
      <NavbarBrand className="p-0">
        <Link to="/">
          <Brand
            src={tracker.brandSrc}
            alt="Jolly Roger logo"
            srcSet={`${tracker.brandSrc} 1x, ${tracker.brandSrc2x} 2x`}
          />
        </Link>
      </NavbarBrand>
      {breadcrumbsComponent}
      <Nav className="ml-auto">
        <Dropdown as={NavItem}>
          <DropdownToggle id="profileDropdown" as={NavLink}>
            <FontAwesomeIcon icon={faUser} />
            {' '}
            <NavUsername>{tracker.displayName}</NavUsername>
          </DropdownToggle>
          <DropdownMenu alignRight>
            <RRBS.LinkContainer to={`/users/${tracker.userId}`}>
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
            <DropdownItem eventKey="3" onSelect={logout}>Sign out</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </Nav>
    </Navbar>
  );
};

const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <NotificationCenter />
      <AppNavbar />
      <ConnectionStatus />
      <div className="container-fluid pt-2">
        {children}
      </div>
    </div>
  );
};

export default App;
