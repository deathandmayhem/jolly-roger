import { Meteor } from 'meteor/meteor';
import React from 'react';
import { browserHistory } from 'react-router';
// TODO: ReactMeteorData

Authenticator = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    return {user: Meteor.user()};
  },

  checkAuth() {
    if (!this.data.user && this.props.route.authenticated) {
      browserHistory.replaceState(_.pick(this.props.location, 'pathname', 'query'), '/login');
    } else if (this.data.user && !this.props.route.authenticated) {
      const state = _.extend({path: '/', query: undefined}, this.props.location.state);
      browserHistory.replaceState(null, state.pathname, state.query);
    }
  },

  componentWillMount() {
    this.checkAuth();
  },

  componentDidUpdate(_prevProps, _prevState) {
    this.checkAuth();
  },

  render() {
    return React.Children.only(this.props.children);
  },
});
