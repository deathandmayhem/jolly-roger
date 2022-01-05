import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useState } from 'react';
import {
  Redirect, Route, RouteProps, useLocation,
} from 'react-router';
import App from './App';

interface AuthWrapperProps {
  render: () => React.ReactNode;
}

const AuthWrapper = React.memo(({ render }: AuthWrapperProps) => {
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
      {render()}
    </App>
  );
});

const AuthenticatedRoute = React.memo((props: Exclude<RouteProps, 'component' | 'children'> & AuthWrapperProps) => {
  // Pull off the component, which we'll pass to AuthWrapperContainer.
  // The rest of the props are from RouteProps
  const { render, ...rest } = props;
  return (
    <Route {...rest}>
      <AuthWrapper render={render} />
    </Route>
  );
});

export default AuthenticatedRoute;
