import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import { browserHistory } from 'react-router';
import { withTracker } from 'meteor/react-meteor-data';
import { Location } from 'history';

interface AuthenticatorParams {
  route: {authenticated: boolean};
  children: React.ReactNode;
  location: Location;
}

interface AuthenticatorProps extends AuthenticatorParams {
  loggingIn: boolean;
  userId: string | null;
}

interface AuthenticatorState {
  loading: boolean;
}

class Authenticator extends React.Component<AuthenticatorProps, AuthenticatorState> {
  static propTypes = {
    route: PropTypes.shape({ authenticated: PropTypes.bool.isRequired }).isRequired,
    children: PropTypes.node.isRequired,
    location: PropTypes.any,
    loggingIn: PropTypes.bool.isRequired,
    userId: PropTypes.string,
  };

  state = { loading: true };

  componentDidMount() {
    this.checkAuth();
  }

  componentDidUpdate() {
    this.checkAuth();
  }

  checkAuth = () => {
    if (this.state.loading) {
      if (this.props.loggingIn) {
        return;
      } else {
        this.setState({ loading: false });
      }
    }

    if (!this.props.userId && this.props.route.authenticated) {
      const stateToSave = _.pick(this.props.location, 'pathname', 'query');
      browserHistory.replace({
        pathname: '/login',
        state: stateToSave,
      });
    } else if (this.props.userId && !this.props.route.authenticated) {
      const state = _.extend({ path: '/', query: undefined }, this.props.location.state);
      browserHistory.replace({
        pathname: state.pathname,
        query: state.query,
      });
    }
  };

  render() {
    if (this.state.loading) {
      return <div />;
    }

    return React.Children.only(this.props.children);
  }
}

export default withTracker((_params: AuthenticatorParams) => {
  return {
    loggingIn: Meteor.loggingIn(),
    userId: Meteor.userId(),
  };
})(Authenticator);
