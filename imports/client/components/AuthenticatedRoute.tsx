import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useState } from 'react';
import {
  Redirect, Route, useLocation,
} from 'react-router';
import App from './App';

// AuthenticatedRouteProps is intended to support and forward a subset of
// react-router's RouteProps with the additional constraint that only
// `component` is allowed (not `render` nor `children`)
interface AuthenticatedRouteProps {
  component: React.ComponentType<any>;
  path: string | string[];
  exact?: boolean;
  sensitive?: boolean;
  strict?: boolean;
}

interface AuthWrapperProps {
  component: React.ComponentType<any>;
}

/// JSX is case-sensitive so uppercase component before attempting to render.
const AuthWrapper = React.memo(({ component: Component }: AuthWrapperProps) => {
  const location = useLocation();

  const tracker = useTracker(() => {
    return {
      loggingIn: Meteor.loggingIn(),
      userId: Meteor.userId(),
    };
  }, []);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if we're done logging in
    if (loading) {
      if (!tracker.loggingIn) {
        setLoading(false);
      }
    }
  }, [loading, tracker.loggingIn]);

  if (loading) {
    return <div />;
  }

  if (!tracker.userId) {
    const { pathname, search } = location;
    return (
      <Redirect to={{
        pathname: '/login',
        state: { pathname, search },
      }}
      />
    );
  }

  return (
    <App>
      <Component />
    </App>
  );
});

const AuthenticatedRoute = React.memo((authedRouteProps: AuthenticatedRouteProps) => {
  // Pull off the component, which we'll pass to AuthWrapperContainer.
  // The rest of the props are from RouteProps
  const { component, ...rest } = authedRouteProps;
  return (
    <Route {...rest}>
      <AuthWrapper component={component} />
    </Route>
  );
});

export default AuthenticatedRoute;
