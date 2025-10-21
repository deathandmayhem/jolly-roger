import styled, { css } from "styled-components";

export const TopRightButtonGroup = styled.div`
  position: absolute;
  top: -10px;
  right: -10px;
  display: flex;
  gap: 8px; /* Adjust spacing between buttons */
  z-index: 1052; /* Ensure buttons are above image */
`;

export const LightboxOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050; // Ensure it's above other content
  cursor: pointer; // Indicate it's clickable to close
`;

export const LightboxContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  cursor: default; // Prevent closing when clicking the content area
  display: flex; // Use flex for image centering
  align-items: center;
  justify-content: center;
`;

export const LightboxImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; // Scale image while preserving aspect ratio
  border-radius: 4px; // Optional: slight rounding
`;

export const LightboxButton = styled.button<{
  $position?: "top-right" | "center-left" | "center-right";
}>`
  background: rgba(30, 30, 30, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 1051;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }

  // eslint-disable-next-line consistent-return
  ${({ $position }) => {
    // eslint-disable-next-line default-case
    switch ($position) {
      case "top-right":
        return css`
          position: absolute;
          top: -10px;
          right: -10px;
        `;
      case "center-left":
        return css`
          position: absolute;
          top: 50%;
          left: -25px;
          transform: translateY(-50%);
        `;
      case "center-right":
        return css`
          position: absolute;
          top: 50%;
          right: -25px;
          transform: translateY(-50%);
        `;
    }
  }}

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;
