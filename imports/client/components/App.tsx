import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle';
import { faUser } from '@fortawesome/free-solid-svg-icons/faUser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import Alert from 'react-bootstrap/Alert';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownItem from 'react-bootstrap/DropdownItem';
import DropdownMenu from 'react-bootstrap/DropdownMenu';
import DropdownToggle from 'react-bootstrap/DropdownToggle';
import Nav from 'react-bootstrap/Nav';
import NavItem from 'react-bootstrap/NavItem';
import NavLink from 'react-bootstrap/NavLink';
import Navbar from 'react-bootstrap/Navbar';
import NavbarBrand from 'react-bootstrap/NavbarBrand';
import Button from 'react-bootstrap/esm/Button';
import Container from 'react-bootstrap/esm/Container';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import * as RRBS from 'react-router-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import StackTrace, { StackFrame } from 'stacktrace-js';
import styled, { css } from 'styled-components';
import isAdmin from '../../lib/isAdmin';
import { useBreadcrumbItems } from '../hooks/breadcrumb';
import lookupUrl from '../lookupUrl';
import ConnectionStatus from './ConnectionStatus';
import Loading from './Loading';
import NotificationCenter from './NotificationCenter';
import { NavBarHeight } from './styling/constants';
import { mediaBreakpointDown } from './styling/responsive';

const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  height: ${NavBarHeight};
  flex: 1;
  min-width: 0;
`;

const ContentContainer = styled.div`
  margin-top: calc(env(safe-area-inset-top, 0px) + ${NavBarHeight});
  padding-bottom: max(env(safe-area-inset-bottom, 0px), 20px);
  padding-left: max(env(safe-area-inset-left, 0px), 15px);
  padding-right: max(env(safe-area-inset-right, 0px), 15px);
`;

/* Using some prefixed styles with widespread support and graceful failure */
/* stylelint-disable value-no-vendor-prefix */
const BreadcrumbList = styled.ol`
  list-style: none;
  display: block;
  display: -webkit-box;
  max-height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin: 0;
  padding: 0;
`;
/* stylelint-enable value-no-vendor-prefix */

const BreadcrumbItem = styled.li`
  display: inline;
  text-indent: 0;
  color: #6c757d;

  + li {
    padding-left: 0.5rem;

    &::before {
      content: "/";
      padding-right: 0.5rem;
    }
  }
`;

const NavbarInset = styled(Navbar)`
  margin-top: env(safe-area-inset-top, 0);
  padding-left: env(safe-area-inset-right, 0);
  padding-right: calc(env(safe-area-inset-right, 0) + 4px);
`;

const NavUsername = styled.span`
  ${mediaBreakpointDown('sm', css`
    display: none;
  `)}
`;

const Brand = styled.img`
  width: ${NavBarHeight};
  height: ${NavBarHeight};
`;

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  const [frames, setFrames] = useState<StackFrame[] | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      setFrames(await StackTrace.fromError(error));
    })();
  }, [error]);

  const navigate = useNavigate();
  const goBack = useCallback(() => navigate(-1), [navigate]);
  return (
    <Container>
      <Alert variant="danger">
        <Alert.Heading>
          <FontAwesomeIcon icon={faExclamationTriangle} fixedWidth />
          {' '}
          Something went wrong
        </Alert.Heading>

        <p>
          Something went wrong while you were using Jolly Roger. This is most
          likely a bug in the app, rather than something you did.
        </p>

        <p>
          Send these details to the Jolly Roger team so that they can help fix
          it:
        </p>

        <pre>
          {frames ? (
            <>
              {error.message}
              {'\n'}
              {frames.map((f) => `    ${f.toString()}`).join('\n')}
            </>
          ) : (
            <Loading inline />
          )}
        </pre>

        <p>
          In the mean time, you can try resetting this part of the site or
          going back to the last page (a particularly useful option if you just
          clicked on a link)
        </p>

        <p>
          <Button type="button" onClick={resetErrorBoundary}>
            Reset
          </Button>
          {' '}
          <Button type="button" onClick={goBack}>
            Go back
          </Button>
        </p>

        <p>
          But that may just make things crash again. If it does, try navigating
          to a different part of the site using the navigation bar at the top of
          the page.
        </p>
      </Alert>
    </Container>
  );
};

const AppNavbar = () => {
  const userId = useTracker(() => Meteor.userId()!, []);

  const displayName = useTracker(() => Meteor.user()?.displayName ?? '<no name given>', []);
  const { brandSrc, brandSrc2x } = useTracker(() => {
    return {
      brandSrc: lookupUrl('brand.png'),
      brandSrc2x: lookupUrl('brand@2x.png'),
    };
  }, []);
  const userIsAdmin = useTracker(() => isAdmin(Meteor.user()), []);

  const navigate = useNavigate();
  const logout = useCallback(() => {
    // Logout, then immediately redirect to the login page
    Meteor.logout(() => navigate('/login', { replace: true }));
  }, [navigate]);

  const crumbs = useBreadcrumbItems();
  const breadcrumbsComponent = useMemo(() => {
    return (
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
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
    <NavbarInset fixed="top" bg="light" variant="light" className="py-0">
      <NavbarBrand className="p-0">
        <Link to="/">
          <Brand
            src={brandSrc}
            alt="Jolly Roger logo"
            srcSet={`${brandSrc} 1x, ${brandSrc2x} 2x`}
          />
        </Link>
      </NavbarBrand>
      {breadcrumbsComponent}
      <Nav className="ml-auto">
        <Dropdown as={NavItem}>
          <DropdownToggle id="profileDropdown" as={NavLink}>
            <FontAwesomeIcon icon={faUser} />
            {' '}
            <NavUsername>{displayName}</NavUsername>
          </DropdownToggle>
          <DropdownMenu align="end">
            <RRBS.LinkContainer to={`/users/${userId}`}>
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
            {userIsAdmin ? (
              <RRBS.LinkContainer to="/setup">
                <DropdownItem eventKey="4">Server setup</DropdownItem>
              </RRBS.LinkContainer>
            ) : undefined}
            <DropdownItem eventKey="3" onClick={logout}>Sign out</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </Nav>
    </NavbarInset>
  );
};

const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <NotificationCenter />
      <AppNavbar />
      <ConnectionStatus />
      <ContentContainer className="container-fluid pt-2">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          {children}
        </ErrorBoundary>
      </ContentContainer>
    </div>
  );
};

export default App;
