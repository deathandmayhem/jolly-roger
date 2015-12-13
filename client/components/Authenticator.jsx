Authenticator = React.createClass({
  mixins: [ReactMeteorData, ReactRouter.History],

  getMeteorData() {
    return {user: Meteor.user()};
  },

  checkAuth() {
    if (!this.data.user && this.props.route.authenticated) {
      this.history.replaceState(_.pick(this.props.location, 'pathname', 'query'), '/login');
    } else if (this.data.user && !this.props.route.authenticated) {
      const state = _.extend({path: '/', query: undefined}, this.props.location.state);
      this.history.replaceState(null, state.path, state.query);
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
