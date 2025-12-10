import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import styled from "styled-components";
import type { GuessType } from "../../lib/models/Guesses";

const GuessDetail = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
`;

const GuessConfidenceProgress = styled.div`
  && {
    flex-grow: 1;
    height: 1em;
    background-color: white;
    border: 1px black solid;
  }
`;

const GuessConfidenceProgressBar = styled.div<{ $value: number }>`
  &&& {
    background-color: grey;
    width: ${({ $value }) => $value}%;
    height: 100%;
  }
`;

const GuessDirectionSvg = styled.svg`
  flex-grow: 1;
  width: 1px;
  height: 1em;
  fill: grey;

  line {
    stroke: black;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
`;

const formatGuessDirection = (value: GuessType["direction"]) => {
  if (value === undefined) {
    return "Unspecified";
  }
  if (value === 0) {
    return "Neutral";
  }
  const directionStr = value > 0 ? "Forward" : "Back";
  return `${directionStr} ${Math.abs(value)}`;
};

const GuessDirection = ({
  id,
  value,
  className,
}: {
  id: string;
  value: GuessType["direction"];
  className?: string;
}) => {
  const arrowShaftWidth = 0.3;
  const arrowHeadWidth = 1.0; // 0 < arrowHeadWidth <= 1
  const arrowHeadBaseDepth = 1.0; // 0 < arrowHeadBaseDepth <= 1
  const arrowHeadFullDepth = 1.5; // arrowHeadBaseDepth <= arrowHeadFullDepth

  const tooltip = (
    <Tooltip id={`${id}-tooltip`}>
      <strong>Solve directon:</strong> {formatGuessDirection(value)}
    </Tooltip>
  );
  const arrowHeadEnd = value ?? 0;
  const arrowHeadBase =
    arrowHeadEnd - Math.sign(arrowHeadEnd) * arrowHeadBaseDepth;
  const arrowHeadStart =
    arrowHeadEnd - Math.sign(arrowHeadEnd) * arrowHeadFullDepth;
  return (
    <GuessDetail className={className}>
      <OverlayTrigger placement="top" overlay={tooltip}>
        <GuessDirectionSvg xmlns="htp://www.w3.org/2000/svg">
          <svg viewBox="-10 -1 20 2" preserveAspectRatio="none">
            <line x1="-10" y1="0" x2="10" y2="0" />
            {value && (
              <polygon
                points={`
                0, ${arrowShaftWidth}
                ${arrowHeadBase}, ${arrowShaftWidth}
                ${arrowHeadStart}, ${arrowHeadWidth}
                ${arrowHeadEnd}, 0
                ${arrowHeadStart}, ${-arrowHeadWidth}
                ${arrowHeadBase}, ${-arrowShaftWidth}
                0, ${-arrowShaftWidth}`}
              />
            )}
          </svg>
          {value === 0 && (
            <svg
              viewBox="-1 -1 2 2"
              preserveAspectRatio="xMidYMid meet"
              width="100%"
              height={`${arrowShaftWidth * 100}%`}
              x="0"
              y={`${(1 - arrowShaftWidth) * 50}%`}
            >
              <circle cx="0" cy="0" r="1" />
            </svg>
          )}
        </GuessDirectionSvg>
      </OverlayTrigger>
    </GuessDetail>
  );
};

const formatConfidence = (value: GuessType["confidence"]) => {
  if (value === undefined) {
    return "Unspecified";
  }
  return `${value}%`;
};

const GuessConfidence = ({
  id,
  value,
  className,
}: {
  id: string;
  value: GuessType["confidence"];
  className?: string;
}) => {
  const tooltip = (
    <Tooltip id={`${id}-tooltip`}>
      <strong>Confidence:</strong> {formatConfidence(value)}
    </Tooltip>
  );

  return (
    <GuessDetail className={className}>
      <OverlayTrigger placement="top" overlay={tooltip}>
        <GuessConfidenceProgress>
          <GuessConfidenceProgressBar $value={value ?? 0} />
        </GuessConfidenceProgress>
      </OverlayTrigger>
    </GuessDetail>
  );
};

export {
  GuessDirection,
  GuessConfidence,
  formatGuessDirection,
  formatConfidence,
};
