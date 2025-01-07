import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import Bugsnag from "@bugsnag/js";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownItem from "react-bootstrap/DropdownItem";
import DropdownMenu from "react-bootstrap/DropdownMenu";
import DropdownToggle from "react-bootstrap/DropdownToggle";
import Nav from "react-bootstrap/Nav";
import NavItem from "react-bootstrap/NavItem";
import NavLink from "react-bootstrap/NavLink";
import Navbar from "react-bootstrap/Navbar";
import NavbarBrand from "react-bootstrap/NavbarBrand";
import Button from "react-bootstrap/esm/Button";
import Container from "react-bootstrap/esm/Container";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import * as RRBS from "react-router-bootstrap";
import { useNavigate, Link, useParams } from "react-router-dom";
import type { StackFrame } from "stacktrace-js";
import StackTrace from "stacktrace-js";
import styled, { css } from "styled-components";
import isAdmin from "../../lib/isAdmin";
import { useBreadcrumbItems } from "../hooks/breadcrumb";
import lookupUrl from "../lookupUrl";
import ConnectionStatus from "./ConnectionStatus";
import HuntNav from "./HuntNav";
import Loading from "./Loading";
import NotificationCenter from "./NotificationCenter";
import { NavBarHeight } from "./styling/constants";
import { mediaBreakpointDown } from "./styling/responsive";

const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  height: ${NavBarHeight};
  flex: 1 1 auto;
  min-width: 0;
`;

const ContentContainer = styled.div`
  padding: /* top right bottom left */ max(env(safe-area-inset-top, 0px), 15px)
    max(env(safe-area-inset-right, 0px), 15px)
    max(env(safe-area-inset-bottom, 0px), 20px)
    max(env(safe-area-inset-left, 0px), 15px);
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
  color: rgb(0 0 0 / 65%);

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
  ${mediaBreakpointDown(
    "sm",
    css`
      display: none;
    `,
  )}
`;

const Brand = styled.img`
  width: ${NavBarHeight};
  height: ${NavBarHeight};
`;

const HuntNavWrapper = styled.div`
  ${mediaBreakpointDown(
    "sm",
    css`
      display: none;
    `,
  )}
`;

const ErrorFallback = ({
  error,
  clearError,
}: {
  error: Error;
  clearError: () => void;
}) => {
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
          <FontAwesomeIcon icon={faExclamationTriangle} fixedWidth /> Something
          went wrong
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
              {"\n"}
              {frames.map((f) => `    ${f.toString()}`).join("\n")}
            </>
          ) : (
            <Loading inline />
          )}
        </pre>

        <p>
          In the mean time, you can try resetting this part of the site or going
          back to the last page (a particularly useful option if you just
          clicked on a link)
        </p>

        <p>
          <Button type="button" onClick={clearError}>
            Reset
          </Button>{" "}
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

const ReactErrorBoundaryFallback = ({
  error,
  resetErrorBoundary,
}: FallbackProps) => {
  return <ErrorFallback error={error} clearError={resetErrorBoundary} />;
};

const AppNavbar = () => {
  const userId = useTracker(() => Meteor.userId()!, []);
  const huntId = useParams<"huntId">().huntId!;

  const displayName = useTracker(
    () => Meteor.user()?.displayName ?? "<no name given>",
    [],
  );
  const { brandSrc, brandSrc2x } = useTracker(() => {
    return {
      brandSrc: lookupUrl("brand.png"),
      brandSrc2x: lookupUrl("brand@2x.png"),
    };
  }, []);
  const userIsAdmin = useTracker(() => isAdmin(Meteor.user()), []);

  const navigate = useNavigate();
  const logout = useCallback(() => {
    // Logout, then immediately redirect to the login page
    Meteor.logout(() => navigate("/login", { replace: true }));
  }, [navigate]);

  const crumbs = useBreadcrumbItems();
  const breadcrumbsComponent = useMemo(() => {
    return (
      <Breadcrumb aria-label="breadcrumb">
        <BreadcrumbList>
          {crumbs
            .filter((crumb) => crumb.title !== "Hunts")
            .map((crumb, index) => {
              const last = index === crumbs.length - 1;
              if (last) {
                return (
                  <BreadcrumbItem key={crumb.path} aria-current="page">
                    <Link to={crumb.path}>{crumb.title}</Link>
                  </BreadcrumbItem>
                );
              } else {
                return (
                  <BreadcrumbItem key={crumb.path}>
                    <Link to={crumb.path}>{crumb.title}</Link>
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
    <NavbarInset
      variant="light"
      style={{
        backgroundColor: "#f0f0f0",
        borderBottom: "1px solid #6c757d",
      }}
      className="py-0"
    >
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
      {huntId && (
        <HuntNavWrapper>
          <HuntNav />
        </HuntNavWrapper>
      )}
      <Nav className="ml-auto">
        <Dropdown as={NavItem}>
          <DropdownToggle id="profileDropdown" as={NavLink}>
            <FontAwesomeIcon icon={faUser} />{" "}
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
            <DropdownItem eventKey="3" onClick={logout}>
              Sign out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </Nav>
    </NavbarInset>
  );
};

const BugsnagErrorBoundary = Bugsnag.isStarted()
  ? Bugsnag.getPlugin("react")?.createErrorBoundary(React)
  : undefined;

const App = ({ children }: { children: React.ReactNode }) => {
  // If Bugsnag is configured, use its error boundary. But if it's not
  // configured, Bugsnag.getPlugin will return undefined, so we need to fallback
  // on react-error-boundary, whose UI behavior is more or less the same.
  let errorBoundary;
  if (BugsnagErrorBoundary) {
    errorBoundary = (
      <BugsnagErrorBoundary FallbackComponent={ErrorFallback}>
        {children}
      </BugsnagErrorBoundary>
    );
  } else {
    errorBoundary = (
      <ReactErrorBoundary FallbackComponent={ReactErrorBoundaryFallback}>
        {children}
      </ReactErrorBoundary>
    );
  }

  return (
    <div>
      <NotificationCenter />
      <AppNavbar />
      <ConnectionStatus />
      <ContentContainer className="container-fluid">
        {errorBoundary}
      </ContentContainer>
    </div>
  );
};

export default App;
