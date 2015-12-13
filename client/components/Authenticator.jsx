Authenticator = React.createClass({
  mixins: [ReactMeteorData, ReactRouter.History],

  getMeteorData() {
    return {user: Meteor.user()};
  },

  checkAuth() {
    if (!this.data.user) {
      this.history.replaceState(_.pick(this.props.location, 'pathname', 'query'), '/login');
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
