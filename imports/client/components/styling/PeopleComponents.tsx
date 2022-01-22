import Button from 'react-bootstrap/Button';
import styled, { css } from 'styled-components';
import { PuzzlePagePadding } from './constants';

export const ChatterSubsection = styled.div`
  margin-top: 4px;
`;

export const ChatterSubsectionHeader = styled.header`
  margin: 4px 0;
  cursor: pointer;
`;

export const AVActions = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: ${PuzzlePagePadding};
`;

export const AVButton = styled(Button)`
  flex: 1;
  padding-right: 2px;
  padding-left: 2px;
  display: flex;
  align-items: center;
  justify-content: center;

  & + & {
    margin-left: ${PuzzlePagePadding};
  }
`;

export const PeopleListDiv = styled.div<{ collapsed?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;

  &:not(:empty) {
    margin: -4px -4px 0 0;
  }

  ${({ collapsed }) => collapsed && css`
    display: none;
  `}
`;

export const PeopleItemDiv = styled.div`
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  background: white;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 4px 4px 0 0;
`;

export const InitialSpan = styled.span<{ live: boolean }>`
  z-index: 10;
  text-transform: uppercase;
  font-weight: bold;
  font-size: 24px;
  color: black;
  line-height: 24px;
  ${({ live }) => live && css`
    // white border around initial
    // aids readability if the spectrum graph is high
    text-shadow: -1px  1px 0 white,
                  1px  1px 0 white,
                  1px -1px 0 white,
                 -1px -1px 0 white;
  `}
`;
