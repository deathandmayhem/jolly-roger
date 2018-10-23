import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import { browserHistory } from 'react-router';
import { withTracker } from 'meteor/react-meteor-data';

class Authenticator extends React.Component {
  static propTypes = {
    route: PropTypes.object,
    children: PropTypes.node,
    location: PropTypes.object,
    loggingIn: PropTypes.bool,
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

export default withTracker(() => {
  return {
    loggingIn: Meteor.loggingIn(),
    userId: Meteor.userId(),
  };
})(Authenticator);
