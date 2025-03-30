import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import App from "./App";
import SplashPage from "./SplashPage";
import { useAppThemeState } from "../hooks/persisted-state";

export const useAuthenticated = () => {
  const { loggingIn, loggedIn } = useTracker(() => {
    return {
      loggingIn: Meteor.loggingIn(),
      loggedIn: !!Meteor.userId(),
    };
  }, []);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if we're done logging in
    if (loading) {
      if (!loggingIn) {
        setLoading(false);
      }
    }
  }, [loading, loggingIn]);

  return [loading, loggedIn];
};

export const AuthenticatedPage = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loading, loggedIn] = useAuthenticated();
  const location = useLocation();
  const [appTheme, setAppTheme] = useAppThemeState();

  useEffect(() => {
    // This is a bit of a hack, but I think it's going to be the only
    // way that it works. That's because we don't have the ability to
    // manipulate the DOM through usual React methods, so we're doing
    // it directly instead.
    const body = document.body;
    body.setAttribute("data-bs-theme", appTheme ?? "light");
    return () => {
      body.removeAttribute("data-bs-theme");
    };
  }, [appTheme]);

  if (loading) {
    return null;
  }

  if (!loggedIn) {
    const { pathname, search } = location;
    return <Navigate to="/login" state={{ pathname, search }} />;
  }

  return <App>{children}</App>;
};

export const UnauthenticatedPage = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loading, loggedIn] = useAuthenticated();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (loggedIn) {
    const { pathname = "/", search = undefined } = location.state || {};
    return <Navigate to={{ pathname, search }} />;
  }

  return <SplashPage>{children}</SplashPage>;
};
