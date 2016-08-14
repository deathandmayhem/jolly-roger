import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import { browserHistory } from 'react-router';
import { ReactMeteorData } from 'meteor/react-meteor-data';

const Authenticator = React.createClass({
  propTypes: {
    route: React.PropTypes.object,
    children: React.PropTypes.node,
    location: React.PropTypes.object,
  },

  mixins: [ReactMeteorData],

  componentWillMount() {
    this.checkAuth();
  },

  componentDidUpdate() {
    this.checkAuth();
  },

  getMeteorData() {
    return { user: Meteor.user() };
  },

  checkAuth() {
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
    return React.Children.only(this.props.children);
  },
});

export { Authenticator };
