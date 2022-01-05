import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useState } from 'react';
import {
  Redirect, Route, RouteProps, useLocation,
} from 'react-router';
import SplashPage from './SplashPage';

interface UnauthWrapperProps {
  render: () => React.ReactNode;
}

const UnauthWrapper = React.memo(({ render }: UnauthWrapperProps) => {
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
    <SplashPage>
      {render()}
    </SplashPage>
  );
});

const UnauthenticatedRoute = React.memo((props: Exclude<RouteProps, 'component' | 'children'> & UnauthWrapperProps) => {
  // Pull off the render method, which we'll pass to UnauthWrapper.
  // The rest of the props are from RouteProps
  const { render, ...rest } = props;
  return (
    <Route {...rest}>
      <UnauthWrapper render={render} />
    </Route>
  );
});

export default UnauthenticatedRoute;
