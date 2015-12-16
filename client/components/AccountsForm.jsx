const BS = ReactBootstrap;
const {Link} = ReactRouter;

AccountsForm = React.createClass({
  render() {
    AccountsTemplates.paramToken = this.props.params.token;

    return (
      <div className="container">
        <BS.Jumbotron id="jr-login">
          <BS.Image src="/images/hero.png" className="center-block" responsive/>
          <div className="container">
            <BS.Row>
              <BS.Col md={6} mdOffset={3}>
                <BlazeToReact blazeTemplate="atForm" state={this.props.route.state} />
              </BS.Col>
            </BS.Row>
          </div>
        </BS.Jumbotron>
      </div>
    );
  },
});
