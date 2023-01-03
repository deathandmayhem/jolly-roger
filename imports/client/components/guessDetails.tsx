import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import styled from 'styled-components';
import { GuessType } from '../../lib/schemas/Guess';

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

const GuessDirection = ({ value, className }: {
  value: GuessType['direction'];
  className?: string;
}) => {
  return (
    <GuessDetail className={className}>
      <FontAwesomeIcon icon={(value ?? 0) < 0 ? faArrowLeft : faArrowRight} fixedWidth />
      {' '}
      {value ?? 0}
    </GuessDetail>
  );
};

const GuessConfidence = ({ id, value, className }: {
  id: string;
  value: GuessType['confidence'];
  className?: string;
}) => {
  const tooltip = (
    <Tooltip id={`${id}-tooltip`}>
      <strong>Confidence:</strong>
      {' '}
      {value}
      %
    </Tooltip>
  );

  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      <GuessDetail className={className}>
        <GuessConfidenceProgress>
          <GuessConfidenceProgressBar $value={value ?? 0} />
        </GuessConfidenceProgress>
      </GuessDetail>
    </OverlayTrigger>
  );
};

export { GuessDirection, GuessConfidence };
