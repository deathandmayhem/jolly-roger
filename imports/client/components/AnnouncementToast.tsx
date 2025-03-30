import { faMicrophoneAlt } from "@fortawesome/free-solid-svg-icons/faMicrophoneAlt";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import Toast from "react-bootstrap/Toast";
import styled from "styled-components";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import Markdown from "./Markdown";
import { Theme } from "../theme";

const StyledNotificationTimestamp = styled.small`
  text-align: end;
`;

const AnnouncementToast = ({
  displayName,
  message,
  createdAt,
  onClose,
  className,
  theme,
}: {
  displayName: string;
  message: string;
  createdAt: Date;
  onClose?: () => void;
  className?: string;
  theme: Theme;
}) => {
  return (
    <Toast
      className={className}
      onClose={onClose}
      style={{
        backgroundColor: theme.colors.announcementToastBackground,
        color: theme.colors.announcementToastText,
        border: `1px solid ${theme.colors.announcementToastBorder}`,
      }}
    >
      <Toast.Header closeButton={!!onClose}>
        <FontAwesomeIcon
          icon={faMicrophoneAlt}
          style={{
            marginRight: ".4em",
          }}
        />
        <strong className="me-auto">Announcement from {displayName}</strong>
        <StyledNotificationTimestamp>
          {calendarTimeFormat(createdAt)}
        </StyledNotificationTimestamp>
      </Toast.Header>
      <Toast.Body>
        <Markdown text={message} />
      </Toast.Body>
    </Toast>
  );
};

export default AnnouncementToast;
