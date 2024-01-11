import React from "react";
import styled, { createGlobalStyle } from "styled-components";
import { NavBarHeight } from "./constants";

const FixedLayoutDiv = styled.div`
  position: fixed;
  inset: /* top right bottom left */ calc(
      env(safe-area-inset-top, 0) + ${NavBarHeight} + 1px
    )
    env(safe-area-inset-right, 0) 0 env(safe-area-inset-left, 0);
`;

const FixedLayoutGlobal = createGlobalStyle`
  body {
    overscroll-behavior: none;
  }
`;

const FixedLayout = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  return (
    <>
      <FixedLayoutGlobal />
      <FixedLayoutDiv ref={ref} {...props} />
    </>
  );
});

export default FixedLayout;
