EnrollForm = React.createClass({
  render() {
    AccountsTemplates.paramToken = this.props.params.token;
    return <BlazeToReact blazeTemplate="atForm" state="enrollAccount" />;
  }
});
