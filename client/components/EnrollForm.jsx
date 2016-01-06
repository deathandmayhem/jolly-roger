EnrollForm = React.createClass({
  render() {
    return <AccountForm format='enroll' token={this.props.params.token} />;
  },
});
