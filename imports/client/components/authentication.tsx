import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useState } from 'react';
import { Redirect, useLocation } from 'react-router';
import App from './App';
import SplashPage from './SplashPage';

const useAuthenticated = () => {
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

export const AuthenticatedPage = ({ children }: { children: React.ReactNode }) => {
  const [loading, loggedIn] = useAuthenticated();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!loggedIn) {
    const { pathname, search } = location;
    return (
      <Redirect
        to={{
          pathname: '/login',
          state: { pathname, search },
        }}
      />
    );
  }

  return <App>{children}</App>;
};

export const UnauthenticatedPage = ({ children }: { children: React.ReactNode }) => {
  const [loading, loggedIn] = useAuthenticated();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (loggedIn) {
    const { pathname = '/', search = undefined } = (location.state as any) || {};
    return <Redirect to={{ pathname, search }} />;
  }

  return <SplashPage>{children}</SplashPage>;
};
