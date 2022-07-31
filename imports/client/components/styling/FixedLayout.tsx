import styled from 'styled-components';
import { NavBarHeight } from './constants';

export default styled.div`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0) + ${NavBarHeight});
  bottom: 0;
  left: env(safe-area-inset-left, 0);
  right: env(safe-area-inset-right, 0);
`;
