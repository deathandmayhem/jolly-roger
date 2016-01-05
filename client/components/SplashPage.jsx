const BS = ReactBootstrap;

SplashPage = React.createClass({
  render() {
    return (
      <div className="container">
        <BS.Jumbotron id="jr-login">
          <BS.Image src="/images/hero.png" className="center-block" responsive/>
          <div className="container">
            <BS.Row>
              <BS.Col md={6} mdOffset={3}>
                {this.props.children}
              </BS.Col>
            </BS.Row>
          </div>
        </BS.Jumbotron>
      </div>
    );
  },
});
