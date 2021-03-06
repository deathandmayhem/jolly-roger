import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Row from 'react-bootstrap/Row';
import { lookupUrl } from '../../lib/models/blob_mappings';

interface SplashPageProps {
  children: React.ReactNode;
}

const SplashPage = (props: SplashPageProps) => {
  const data = useTracker(() => {
    const blobMappingsSub = Meteor.subscribe('mongo.blob_mappings');
    const heroSrc = blobMappingsSub.ready() ? lookupUrl('hero.png') : '';
    const heroSrc2x = blobMappingsSub.ready() ? lookupUrl('hero@2x.png') : '';
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
