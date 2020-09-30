import React from 'react';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Row from 'react-bootstrap/Row';

interface SplashPageProps {
  children: React.ReactNode;
}

class SplashPage extends React.Component<SplashPageProps> {
  render() {
    return (
      <div className="container">
        <Jumbotron id="jr-login">
          <Image src="/images/hero.png" className="center-block" srcSet="/images/hero.png 1x, /images/hero@2x.png 2x" />
          <div className="container">
            <Row>
              <Col md={{ span: 6, offset: 3 }}>
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
