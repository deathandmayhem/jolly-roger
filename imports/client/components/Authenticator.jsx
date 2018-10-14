import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import { browserHistory } from 'react-router';
import { ReactMeteorData } from 'meteor/react-meteor-data';

const Authenticator = React.createClass({
  propTypes: {
    route: PropTypes.object,
    children: PropTypes.node,
    location: PropTypes.object,
  },

  mixins: [ReactMeteorData],

  getInitialState() {
    return { loading: true };
  },

  componentWillMount() {
    this.checkAuth();
  },

  componentDidUpdate() {
    this.checkAuth();
  },

  getMeteorData() {
    return {
      loggingIn: Meteor.loggingIn(),
      user: Meteor.user(),
    };
  },

  checkAuth() {
    if (this.state.loading) {
      if (this.data.loggingIn) {
        return;
      } else {
        this.setState({ loading: false });
      }
    }

    if (!this.data.user && this.props.route.authenticated) {
      const stateToSave = _.pick(this.props.location, 'pathname', 'query');
      browserHistory.replace({
        pathname: '/login',
        state: stateToSave,
      });
    } else if (this.data.user && !this.props.route.authenticated) {
      const state = _.extend({ path: '/', query: undefined }, this.props.location.state);
      browserHistory.replace({
        pathname: state.pathname,
        query: state.query,
      });
    }
  },

  render() {
    if (this.state.loading) {
      return <div />;
    }

    return React.Children.only(this.props.children);
  },
});

export default Authenticator;
