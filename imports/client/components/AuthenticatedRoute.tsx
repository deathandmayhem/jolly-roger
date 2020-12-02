import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import React from 'react';
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

interface AuthWrapperContainerProps extends RouteComponentProps {
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

interface AuthWrapperProps extends AuthWrapperContainerProps {
  loggingIn: boolean;
  userId: string | null;
}

interface AuthWrapperState {
  loading: boolean;
}

class AuthWrapper extends React.PureComponent<AuthWrapperProps, AuthWrapperState> {
  constructor(props: AuthWrapperProps) {
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

    if (!this.props.userId) {
      const stateToSave = _.pick(this.props.location, 'pathname', 'search');
      return (
        <Redirect to={{
          pathname: '/login',
          state: stateToSave,
        }}
        />
      );
    }

    return (
      <App {...rest}>
        <Component {...rest} />
      </App>
    );
  }
}

const AuthWrapperContainer = withTracker((_props: AuthWrapperContainerProps) => {
  return {
    loggingIn: Meteor.loggingIn(),
    userId: Meteor.userId(),
  };
})(AuthWrapper);

class AuthenticatedRoute extends React.PureComponent<AuthenticatedRouteProps> {
  render() {
    // Pull off the component, which we'll pass to AuthWrapperContainer.
    // The rest of the props are from RouteProps, to which we'll add our
    // custom `render`.
    const { component, ...rest } = this.props;
    return (
      <Route
        {...rest}
        render={(props: RouteComponentProps) => {
          return (
            <AuthWrapperContainer component={component} {...props} />
          );
        }}
      />
    );
  }
}

export default AuthenticatedRoute;
