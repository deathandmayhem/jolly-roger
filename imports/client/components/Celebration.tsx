import React, { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import PuzzleAnswer from './PuzzleAnswer';

const CelebrationOverlay = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgb(0 0 0 / 20%);
  z-index: 1050;
`;

const CelebrationContainer = styled.div`
  background-color: #f0fff0;
  padding: 24px;
`;

const CelebrationCloseButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
`;

const Celebration = ({
  url, title, answer, playAudio, onClose,
}: {
  url: string;
  title: string;
  answer: string;
  playAudio: boolean;
  onClose: () => void;
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const onCloseCb = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    // Dismiss the celebration on esc
    if (e.keyCode === 27) {
      onCloseCb();
    }
  }, [onCloseCb]);

  const maybeClose = useCallback((e: React.MouseEvent) => {
    // Dismiss the celebration if you click on the overlay div (outside the content)
    if (e.target === e.currentTarget) {
      onCloseCb();
    }
  }, [onCloseCb]);

  // Automatically dismiss self after 7 seconds
  useEffect(() => {
    const timer = window.setTimeout(() => { onCloseCb(); }, 7000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [onCloseCb]);

  // Allow pressing escape key to close the overlay
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  useEffect(() => {
    // Steal focus to the close button on display
    const closeButton = closeButtonRef.current;
    if (closeButton) {
      closeButton.focus();
    }
  });

  return (
    <CelebrationOverlay onClick={maybeClose}>
      <CelebrationContainer>
        <CelebrationCloseButton type="button" onClick={onCloseCb} aria-label="Close" ref={closeButtonRef}>
          <span aria-hidden="true">×</span>
        </CelebrationCloseButton>
        {playAudio ? <audio src="/audio/applause.mp3" autoPlay /> : null}
        <h1>
          We solved
          {' '}
          <Link to={url}>{title}</Link>
          !
        </h1>
        <h2>
          Answer:
          {' '}
          <PuzzleAnswer answer={answer} />
        </h2>
      </CelebrationContainer>
    </CelebrationOverlay>
  );
};

export default Celebration;
