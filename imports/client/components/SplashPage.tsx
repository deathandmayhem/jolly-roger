import { useTracker } from "meteor/react-meteor-data";
import type React from "react";
import { useRef } from "react";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import BSImage from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import styled from "styled-components";
import useEffectiveTheme from "../hooks/useEffectiveTheme";
import lookupUrl from "../lookupUrl";
import { BootstrapScopeProvider } from "./BootstrapScopeContext";

const Jumbotron = styled.div`
  padding-top: 2rem;
  padding-bottom: 2rem;
  background-color: ${({ theme }) => theme.colors.jumbotronBackground};
  border-radius: 0.3rem;
`;

const Image = styled(BSImage)`
  max-width: 50%;
`;

const SplashPage = ({ children }: { children: React.ReactNode }) => {
  const effectiveTheme = useEffectiveTheme();
  const scopeRef = useRef<HTMLDivElement>(null);
  const { heroSrc, heroSrc2x } = useTracker(() => {
    return {
      heroSrc: lookupUrl("hero.png"),
      heroSrc2x: lookupUrl("hero@2x.png"),
    };
  }, []);

  return (
    <div
      className="bootstrap-page"
      data-bs-theme={effectiveTheme}
      ref={scopeRef}
    >
      <BootstrapScopeProvider value={scopeRef}>
        <Container>
          <Jumbotron>
            <Container>
              <Image
                src={heroSrc}
                className="d-block mx-auto"
                srcSet={`${heroSrc} 1x, ${heroSrc2x} 2x`}
              />
              <Row>
                <Col md={{ span: 6, offset: 3 }}>{children}</Col>
              </Row>
            </Container>
          </Jumbotron>
        </Container>
      </BootstrapScopeProvider>
    </div>
  );
};

export default SplashPage;
