import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useState } from 'react';
import { Redirect, Route, RouteComponentProps } from 'react-router';
import App from './App';

// AuthenticatedRouteProps is intended to support and forward a subset of
// react-router's RouteProps with the additional constraint that only
// `component` is allowed (not `render` nor `children`)
interface AuthenticatedRouteProps {
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
  path: string | string[];
  exact?: boolean;
  sensitive?: boolean;
  strict?: boolean;
}

interface AuthWrapperProps extends RouteComponentProps {
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

const AuthWrapper = React.memo((props: AuthWrapperProps) => {
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

  // JSX is case-sensitive, so uppercase component before attempting to render.
  // Peel off the other wrapper-specific props while we're here.
  const {
    component: Component, ...rest
  } = props;

  if (loading) {
    return <div />;
  }

  if (!tracker.userId) {
    const { pathname, search } = props.location;
    return (
      <Redirect to={{
        pathname: '/login',
        state: { pathname, search },
      }}
      />
    );
  }

  return (
    <App {...rest}>
      <Component {...rest} />
    </App>
  );
});

const AuthenticatedRoute = React.memo((authedRouteProps: AuthenticatedRouteProps) => {
  // Pull off the component, which we'll pass to AuthWrapperContainer.
  // The rest of the props are from RouteProps, to which we'll add our
  // custom `render`.
  const { component, ...rest } = authedRouteProps;
  return (
    <Route
      {...rest}
      render={(genericRouteProps: RouteComponentProps) => {
        return (
          <AuthWrapper component={component} {...genericRouteProps} />
        );
      }}
    />
  );
});

export default AuthenticatedRoute;
