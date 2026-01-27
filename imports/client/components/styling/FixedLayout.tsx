import type React from "react";
import styled, { createGlobalStyle, css } from "styled-components";
import { NavBarHeight } from "./constants";

const FixedLayoutDiv = styled.div<{ $narrow?: boolean }>`
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

const FixedLayout = ({
  ref,
  ...props
}: {
  ref?: React.Ref<HTMLDivElement>;
} & React.ComponentProps<typeof FixedLayoutDiv>) => {
  return (
    <>
      <FixedLayoutGlobal />
      <FixedLayoutDiv ref={ref} {...props} />
    </>
  );
};

export default FixedLayout;
