import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";

const Fullsize = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(255 255 255 / 50%);
`;

const Inline = styled.span`
  padding: 0.25rem;
`;

export default React.memo(({ inline = false }: { inline?: boolean }) => {
  const Component = inline ? Inline : Fullsize;
  return (
    <Component>
      <FontAwesomeIcon
        icon={faSpinner}
        color="#aaa"
        size={inline ? undefined : "3x"}
        spinPulse
      />
    </Component>
  );
});
