import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import React, { useEffect, useState } from 'react';
import { Redirect, Route, RouteComponentProps } from 'react-router';
import SplashPage from './SplashPage';

// UnauthenticatedRouteProps is intended to support and forward a subset of
// react-router's RouteProps with the additional constraint that only
// `component` is allowed (not `render` nor `children`)
interface UnauthenticatedRouteProps {
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
  path: string | string[];
  exact?: boolean;
  sensitive?: boolean;
  strict?: boolean;
}

interface UnauthWrapperProps extends RouteComponentProps {
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

const UnauthWrapper = React.memo((props: UnauthWrapperProps) => {
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

  if (tracker.userId) {
    const state = _.extend({ pathname: '/', search: undefined }, props.location.state);
    return (
      <Redirect to={{
        pathname: state.pathname,
        search: state.search,
      }}
      />
    );
  }

  return (
    <Component {...rest} />
  );
});

const UnauthenticatedRoute = React.memo((unauthedRouteProps: UnauthenticatedRouteProps) => {
  // Pull off the component, which we'll pass to UnauthWrapper.
  // The rest of the props are from RouteProps, to which we'll add our
  // custom `render`.
  const { component, ...rest } = unauthedRouteProps;
  return (
    <Route
      {...rest}
      render={(genericRouteProps: RouteComponentProps) => {
        return (
          <SplashPage>
            <UnauthWrapper component={component} {...genericRouteProps} />
          </SplashPage>
        );
      }}
    />
  );
});

export default UnauthenticatedRoute;
