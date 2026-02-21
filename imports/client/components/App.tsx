import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import Bugsnag from "@bugsnag/js";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faMoon } from "@fortawesome/free-solid-svg-icons/faMoon";
import { faSun } from "@fortawesome/free-solid-svg-icons/faSun";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";
import { faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons/faWandMagicSparkles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { StackFrame } from "stacktrace-js";
import StackTrace from "stacktrace-js";
import styled from "styled-components";
import isAdmin from "../../lib/isAdmin";
import { useBreadcrumbItems } from "../hooks/breadcrumb";
import { type AppThemeState, useAppThemeState } from "../hooks/persisted-state";
import useEffectiveTheme from "../hooks/useEffectiveTheme";
import useTailwindTheme from "../hooks/useTailwindTheme";
import lookupUrl from "../lookupUrl";
import { BootstrapScopeProvider } from "./BootstrapScopeContext";
import ConnectionStatus from "./ConnectionStatus";
import HuntNav from "./HuntNav";
import Loading from "./Loading";
import NotificationCenter from "./NotificationCenter";

const ContentContainer = styled.div`
  padding: /* top right bottom left */ max(env(safe-area-inset-top, 0px), 15px)
    max(env(safe-area-inset-right, 0px), 15px)
    max(env(safe-area-inset-bottom, 0px), 20px)
    max(env(safe-area-inset-left, 0px), 15px);

  &:has(> .tailwind-page) {
    padding: 0;
  }
`;

const ErrorFallback = ({
  error,
  clearError,
}: {
  error: unknown;
  clearError: () => void;
}) => {
  const [frames, setFrames] = useState<StackFrame[] | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      if (error instanceof Error) {
        setFrames(await StackTrace.fromError(error));
      }
    })();
  }, [error]);

  const navigate = useNavigate();
  const goBack = useCallback(() => navigate(-1), [navigate]);
  return (
    <Container>
      <Alert variant="danger">
        <Alert.Heading>
          <FontAwesomeIcon icon={faExclamationTriangle} /> Something went wrong
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
          {error instanceof Error ? error.message : String(error)}
          {"\n"}
          {frames ? (
            frames.map((f) => `    ${f.toString()}`).join("\n")
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

const AppNavbar = ({
  appTheme,
  setAppTheme,
}: {
  appTheme: AppThemeState;
  setAppTheme: (appTheme: AppThemeState) => void;
}) => {
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
    Meteor.logout(() => navigate("/login", { replace: true }));
  }, [navigate]);

  const crumbs = useBreadcrumbItems();
  const breadcrumbsComponent = useMemo(() => {
    return (
      <nav
        className="flex items-center h-[50px] flex-1 min-w-0 font-display"
        aria-label="breadcrumb"
      >
        <ol className="list-none line-clamp-2 m-0 p-0">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li
                key={crumb.path}
                className={
                  last
                    ? "inline text-primary-content"
                    : "hidden sm:inline text-primary-content/50"
                }
                aria-current={last ? "page" : undefined}
              >
                {index > 0 && (
                  <span className="hidden sm:inline px-2 text-primary-content/40">
                    /
                  </span>
                )}
                {last ? (
                  crumb.title
                ) : (
                  <Link
                    to={crumb.path}
                    className="text-primary-content/50 hover:text-primary-content"
                  >
                    {crumb.title}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }, [crumbs]);

  const navRef = useRef<HTMLElement>(null);
  const userDetailsRef = useRef<HTMLDetailsElement>(null);

  // Close open <details> menus when clicking outside the navbar,
  // and close other menus when one opens (accordion behavior)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!nav.contains(e.target as Node)) {
        for (const details of nav.querySelectorAll("details[open]")) {
          details.removeAttribute("open");
        }
      }
    };

    const handleToggle = (e: Event) => {
      const toggled = e.target as HTMLDetailsElement;
      if (toggled.open) {
        for (const details of nav.querySelectorAll("details[open]")) {
          if (details !== toggled) {
            details.removeAttribute("open");
          }
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    nav.addEventListener("toggle", handleToggle, true);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      nav.removeEventListener("toggle", handleToggle, true);
    };
  }, []);
  const setAutoMode = useCallback(() => {
    setAppTheme("auto");
    userDetailsRef.current?.removeAttribute("open");
  }, [setAppTheme]);
  const setLightMode = useCallback(() => {
    setAppTheme("light");
    userDetailsRef.current?.removeAttribute("open");
  }, [setAppTheme]);
  const setDarkMode = useCallback(() => {
    setAppTheme("dark");
    userDetailsRef.current?.removeAttribute("open");
  }, [setAppTheme]);
  const { t, i18n } = useTranslation();
  const changeLanguage = useCallback(
    (lng: string) => {
      void i18n.changeLanguage(lng);
      userDetailsRef.current?.removeAttribute("open");
    },
    [i18n],
  );

  return (
    <nav
      ref={navRef}
      className="navbar bg-primary text-primary-content h-[50px] min-h-[50px] py-0 px-1"
      style={{
        marginTop: "env(safe-area-inset-top, 0)",
        paddingLeft: "env(safe-area-inset-left, 0)",
        paddingRight: "calc(env(safe-area-inset-right, 0) + 4px)",
      }}
    >
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <Link to="/" className="flex-shrink-0">
          <img
            className="w-[50px] h-[50px]"
            src={brandSrc}
            alt="Jolly Roger logo"
            srcSet={`${brandSrc} 1x, ${brandSrc2x} 2x`}
          />
        </Link>
        {breadcrumbsComponent}
      </div>
      <ul className="menu menu-horizontal menu-sm flex-shrink-0 px-1">
        {huntId && <HuntNav />}
        <li>
          <details ref={userDetailsRef}>
            <summary>
              <FontAwesomeIcon icon={faUser} />
              <span className="hidden sm:inline">{displayName}</span>
            </summary>
            <ul className="bg-base-100 text-base-content rounded-box z-50 w-56 p-2 shadow right-0">
              <li>
                <Link to={`/users/${userId}`}>
                  {t("navigation.myProfile", "My profile")}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/deathandmayhem/jolly-roger/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("navigation.reportAnIssue", "Report an issue")}
                </a>
              </li>
              {userIsAdmin && (
                <li>
                  <Link to="/setup">
                    {t("navigation.serverSetup", "Server setup")}
                  </Link>
                </li>
              )}
              <li>
                <button type="button" onClick={logout}>
                  {t("navigation.signOut", "Sign out")}
                </button>
              </li>
              <li className="menu-title">
                {t("navigation.theme.header", "Theme")}
              </li>
              <li>
                <button
                  type="button"
                  className={appTheme === "auto" ? "menu-active" : ""}
                  onClick={setAutoMode}
                >
                  <FontAwesomeIcon icon={faWandMagicSparkles} />
                  {t("navigation.theme.auto", "Auto")}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={appTheme === "light" ? "menu-active" : ""}
                  onClick={setLightMode}
                >
                  <FontAwesomeIcon icon={faSun} />
                  {t("navigation.theme.light", "Light mode")}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={appTheme === "dark" ? "menu-active" : ""}
                  onClick={setDarkMode}
                >
                  <FontAwesomeIcon icon={faMoon} />
                  {t("navigation.theme.dark", "Dark mode")}
                </button>
              </li>
              <li className="menu-title">
                {t("navigation.language", "Language")}
              </li>
              <li>
                <button
                  type="button"
                  className={i18n.language === "en" ? "menu-active" : ""}
                  onClick={() => changeLanguage("en")}
                >
                  English
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={i18n.language === "zh" ? "menu-active" : ""}
                  onClick={() => changeLanguage("zh")}
                >
                  中文
                </button>
              </li>
            </ul>
          </details>
        </li>
      </ul>
    </nav>
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

  const [appTheme, setAppTheme] = useAppThemeState();
  const effectiveTheme = useEffectiveTheme();
  const tailwindTheme = useTailwindTheme();
  const scopeRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="bootstrap-page"
      data-bs-theme={effectiveTheme}
      ref={scopeRef}
    >
      <BootstrapScopeProvider value={scopeRef}>
        <NotificationCenter />
        <div className="tailwind-page" data-theme={tailwindTheme}>
          <AppNavbar appTheme={appTheme ?? "light"} setAppTheme={setAppTheme} />
        </div>
        <ConnectionStatus />
        <ContentContainer className="container-fluid">
          {errorBoundary}
        </ContentContainer>
      </BootstrapScopeProvider>
    </div>
  );
};

export default App;
