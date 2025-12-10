import type { ComponentPropsWithRef, FC } from "react";
import Button from "react-bootstrap/Button";
import styled, { css } from "styled-components";
import { PuzzlePagePadding } from "./constants";

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

export const AVButton: FC<ComponentPropsWithRef<typeof Button>> = styled(
  Button,
)`
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

export const PeopleListDiv = styled.div<{ $collapsed?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  padding-right: 12px;
  max-height: 120px;
  overflow-y: auto;
  overflow-x: hidden;

  &:not(:empty) {
    margin: -4px -4px 0 16px;
  }

  ${({ $collapsed }) =>
    $collapsed &&
    css`
      display: none;
    `}
`;

export const PeopleItemDiv = styled.div`
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  background: white;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 4px 4px 0 0;
`;
