import React from 'react';
import Col from 'react-bootstrap/lib/Col';
import Image from 'react-bootstrap/lib/Image';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import Row from 'react-bootstrap/lib/Row';

interface SplashPageProps {
  children: React.ReactNode;
}

class SplashPage extends React.Component<SplashPageProps> {
  render() {
    return (
      <div className="container">
        <Jumbotron id="jr-login">
          <Image src="/images/hero.png" className="center-block" responsive srcSet="/images/hero.png 1x, /images/hero@2x.png 2x" />
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
  }
}

export default SplashPage;
