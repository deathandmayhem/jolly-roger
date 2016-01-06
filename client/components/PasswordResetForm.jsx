PasswordResetForm = React.createClass({
  render() {
    return <AccountForm format="resetPwd" token={this.props.params.token} />;
  },
});
