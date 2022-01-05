import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useState } from 'react';
import { Redirect, Route, useLocation } from 'react-router';
import SplashPage from './SplashPage';

// UnauthenticatedRouteProps is intended to support and forward a subset of
// react-router's RouteProps with the additional constraint that only
// `component` is allowed (not `render` nor `children`)
interface UnauthenticatedRouteProps {
  component: React.ComponentType<any>;
  path: string | string[];
  exact?: boolean;
  sensitive?: boolean;
  strict?: boolean;
}

interface UnauthWrapperProps {
  component: React.ComponentType<any>;
}

// JSX is case-sensitive, so uppercase component before attempting to render.
const UnauthWrapper = React.memo(({ component: Component }: UnauthWrapperProps) => {
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

  if (tracker.userId) {
    const state = { pathname: '/', search: undefined, ...(location.state as any) };
    return (
      <Redirect to={{
        pathname: state.pathname,
        search: state.search,
      }}
      />
    );
  }

  return (
    <Component />
  );
});

const UnauthenticatedRoute = React.memo((unauthedRouteProps: UnauthenticatedRouteProps) => {
  // Pull off the component, which we'll pass to UnauthWrapper.
  // The rest of the props are from RouteProps
  const { component, ...rest } = unauthedRouteProps;
  return (
    <Route {...rest}>
      <SplashPage>
        <UnauthWrapper component={component} />
      </SplashPage>
    </Route>
  );
});

export default UnauthenticatedRoute;
