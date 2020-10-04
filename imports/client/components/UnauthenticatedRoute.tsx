import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import React from 'react';
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

interface UnauthWrapperContainerProps extends RouteComponentProps {
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

interface UnauthWrapperProps extends UnauthWrapperContainerProps {
  loggingIn: boolean;
  userId: string | null;
}

interface UnauthWrapperState {
  loading: boolean;
}

class UnauthWrapper extends React.Component<UnauthWrapperProps, UnauthWrapperState> {
  constructor(props: UnauthWrapperProps) {
    super(props);
    this.state = { loading: true };
  }

  componentDidMount() {
    this.checkReady();
  }

  componentDidUpdate() {
    this.checkReady();
  }

  checkReady = () => {
    if (this.state.loading) {
      if (!this.props.loggingIn) {
        this.setState({ loading: false });
      }
    }
  };

  render() {
    // JSX is case-sensitive, so uppercase component before attempting to render.
    // Peel off the other wrapper-specific props while we're here.
    const {
      component: Component, loggingIn, userId, ...rest
    } = this.props;

    if (this.state.loading) {
      return <div />;
    }

    if (this.props.userId) {
      const state = _.extend({ pathname: '/', search: undefined }, this.props.location.state);
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
  }
}

const UnauthWrapperContainer = withTracker((_props: UnauthWrapperContainerProps) => {
  return {
    loggingIn: Meteor.loggingIn(),
    userId: Meteor.userId(),
  };
})(UnauthWrapper);

class UnauthenticatedRoute extends React.Component<UnauthenticatedRouteProps> {
  render() {
    // Pull off the component, which we'll pass to UnauthWrapperContainer.
    // The rest of the props are from RouteProps, to which we'll add our
    // custom `render`.
    const { component, ...rest } = this.props;
    return (
      <Route
        {...rest}
        render={(props: RouteComponentProps) => {
          return (
            <SplashPage>
              <UnauthWrapperContainer component={component} {...props} />
            </SplashPage>
          );
        }}
      />
    );
  }
}

export default UnauthenticatedRoute;
