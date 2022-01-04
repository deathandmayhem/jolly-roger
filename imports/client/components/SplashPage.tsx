import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import BSImage from 'react-bootstrap/Image';
import BSJumbotron from 'react-bootstrap/Jumbotron';
import Row from 'react-bootstrap/Row';
import styled from 'styled-components';
import lookupUrl from '../lookupUrl';

const Jumbotron = styled(BSJumbotron)`
  padding-top: 2rem;
  padding-bottom: 2rem;
`;

const Image = styled(BSImage)`
  max-width: 50%;
`;

interface SplashPageProps {
  children: React.ReactNode;
}

const SplashPage = (props: SplashPageProps) => {
  const data = useTracker(() => {
    const heroSrc = lookupUrl('hero.png');
    const heroSrc2x = lookupUrl('hero@2x.png');
    return {
      heroSrc,
      heroSrc2x,
    };
  }, []);

  return (
    <Container>
      <Jumbotron id="jr-login">
        <Container>
          <Image src={data.heroSrc} className="d-block mx-auto" srcSet={`${data.heroSrc} 1x, ${data.heroSrc2x} 2x`} />
          <Row>
            <Col md={{ span: 6, offset: 3 }}>
              {props.children}
            </Col>
          </Row>
        </Container>
      </Jumbotron>
    </Container>
  );
};

export default SplashPage;
