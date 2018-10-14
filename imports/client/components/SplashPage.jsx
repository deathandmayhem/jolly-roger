import React from 'react';
import Col from 'react-bootstrap/lib/Col';
import Image from 'react-bootstrap/lib/Image';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import Row from 'react-bootstrap/lib/Row';

const SplashPage = React.createClass({
  propTypes: {
    children: React.PropTypes.node,
  },
  render() {
    return (
      <div className="container">
        <Jumbotron id="jr-login">
          <Image src="/images/hero.png" className="center-block" responsive />
          <div className="container">
            <Row>
              <Col md={6} mdOffset={3}>
                {this.props.children}
              </Col>
            </Row>
          </div>
        </Jumbotron>
      </div>
    );
  },
});

export { SplashPage };
