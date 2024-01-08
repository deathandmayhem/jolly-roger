import styled from "styled-components";
import { NavBarHeight } from "./constants";

export default styled.div`
  position: fixed;
  inset: /* top right bottom left */ calc(
      env(safe-area-inset-top, 0) + ${NavBarHeight}
    )
    env(safe-area-inset-right, 0) 0 env(safe-area-inset-left, 0);
`;
