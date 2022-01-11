import styled from 'styled-components';
import { NavBarHeight } from './constants';

export default styled.div`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + ${NavBarHeight});
  bottom: 0px;
  left: env(safe-area-inset-left, 0px);
  right: env(safe-area-inset-right, 0px);
`;
