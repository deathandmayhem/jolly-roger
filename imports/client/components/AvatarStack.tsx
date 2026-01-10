import React, { type FC, useId } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import styled from "styled-components";
import type { DiscordAccountType } from "../../lib/models/DiscordAccount";
import Avatar from "./Avatar";

export interface AvatarStackUser {
  _id?: string;
  displayName: string;
  discordAccount?: DiscordAccountType;
  isPassive?: boolean;
}

const StackContainer = styled.div<{ $inline?: boolean }>`
  display: ${({ $inline }) => ($inline ? "inline-flex" : "flex")};
  flex-direction: row;
  align-items: center;

  /* Allow the stack to be slightly wider when hovered to avoid jumpiness */
  padding-right: 4px;
`;

const AvatarItem = styled.div<{
  $overlap: number;
  $size: number;
  $isPassive?: boolean;
}>`
  margin-right: -${({ $overlap }) => $overlap}px;
  border: 2px solid
    ${({ theme, $isPassive }) =>
      $isPassive ? theme.colors.warning : theme.colors.success};
  border-radius: 50%;
  transition: all 0.2s ease-in-out;
  position: relative;
  background-color: ${({ theme }) => theme.colors.background};
  overflow: hidden;
  opacity: ${({ $isPassive }) => ($isPassive ? 0.8 : 1)};

  &:hover {
    transform: translateY(-2px);
    z-index: 10;
    margin-right: 4px;
    box-shadow: 0 4px 8px rgb(0 0 0 / 20%);
  }

  /* Last visible avatar shouldn't have negative margin-right if there's no overflow */
  &:last-child {
    margin-right: 0;
  }
`;

const OverflowCount = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => Math.max(10, $size * 0.4)}px;
  font-weight: bold;
  border: 2px solid ${({ theme }) => theme.colors.background};
  z-index: 0;
  margin-left: 4px;
  cursor: default;
`;

const AvatarStack: FC<{
  users: AvatarStackUser[];
  size?: number;
  max?: number;
  inline?: boolean;
  className?: string;
  tooltip?: React.ReactElement;
}> = ({ users, size = 24, max = 3, inline = true, className, tooltip }) => {
  const id = useId();
  const visibleUsers = users.slice(0, max);
  const remaining = users.length - max;
  const overlap = size / 3;

  if (users.length === 0) {
    return null;
  }

  const defaultTooltip = (
    <Tooltip id={id}>{users.map((u) => u.displayName).join(", ")}</Tooltip>
  );

  return (
    <OverlayTrigger placement="left" overlay={tooltip || defaultTooltip}>
      <StackContainer $inline={inline} className={className}>
        {visibleUsers.map((user, i) => (
          <AvatarItem
            key={user._id ?? user.displayName + i}
            $overlap={
              remaining > 0 || i < visibleUsers.length - 1 ? overlap : 0
            }
            $size={size}
            $isPassive={user.isPassive}
          >
            <Avatar
              size={size}
              _id={user._id}
              displayName={user.displayName}
              discordAccount={user.discordAccount}
              title={user.displayName}
              rounded
            />
          </AvatarItem>
        ))}
        {remaining > 0 && (
          <OverflowCount
            $size={size}
            title={`${remaining} more user${remaining > 1 ? "s" : ""}`}
          >
            +{remaining}
          </OverflowCount>
        )}
      </StackContainer>
    </OverlayTrigger>
  );
};

export default AvatarStack;
