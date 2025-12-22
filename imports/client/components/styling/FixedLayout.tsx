import React from "react";
import styled, { createGlobalStyle, css } from "styled-components";
import { NavBarHeight } from "./constants";

interface FixedLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  $narrow?: boolean;
}

const FixedLayoutDiv = styled.div<FixedLayoutProps>`
  position: fixed;
  inset: /* top right bottom left */ calc(
      env(safe-area-inset-top, 0) + ${NavBarHeight} + 1px
    )
    env(safe-area-inset-right, 0) 0 env(safe-area-inset-left, 0);

  ${({ $narrow }) =>
    $narrow &&
    css`
    display: flex;
    flex-direction: column;
  `}
`;

const FixedLayoutGlobal = createGlobalStyle`
  body {
    overscroll-behavior: none;
  }
`;

const FixedLayout = React.forwardRef<HTMLDivElement, FixedLayoutProps>(
  (props, ref) => {
    return (
      <>
        <FixedLayoutGlobal />
        <FixedLayoutDiv ref={ref} {...props} />
      </>
    );
  },
);

export default FixedLayout;
