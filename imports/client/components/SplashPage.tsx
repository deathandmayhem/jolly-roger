import React from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Row from 'react-bootstrap/Row';

interface SplashPageProps {
  children: React.ReactNode;
}

class SplashPage extends React.Component<SplashPageProps> {
  render() {
    return (
      <Container>
        <Jumbotron id="jr-login">
          <Container>
            <Image src="/asset/hero.png" className="d-block mx-auto" srcSet="/asset/hero.png 1x, /asset/hero@2x.png 2x" />
            <Row>
              <Col md={{ span: 6, offset: 3 }}>
                {this.props.children}
              </Col>
            </Row>
          </Container>
        </Jumbotron>
      </Container>
    );
  }
}

export default SplashPage;
