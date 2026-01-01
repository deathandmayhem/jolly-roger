import Toast from "react-bootstrap/Toast";
import styled, { css } from "styled-components";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import Markdown from "./Markdown";

const StyledNotificationTimestamp = styled.small`
  text-align: end;
`;

const StyledToast = styled(Toast)`
  ${({ theme }) => css`
    background-color: ${theme.colors.announcementToastBackground};
    color: ${theme.colors.announcementToastText};
    border: 1px solid ${theme.colors.announcementToastBorder};
  `}
`;

const AnnouncementToast = ({
  displayName,
  message,
  createdAt,
  onClose,
  className,
}: {
  displayName: string;
  message: string;
  createdAt: Date;
  onClose?: () => void;
  className?: string;
}) => {
  return (
    <StyledToast className={className} onClose={onClose}>
      <Toast.Header closeButton={!!onClose}>
        <strong className="me-auto">Announcement from {displayName}</strong>
        <StyledNotificationTimestamp>
          {calendarTimeFormat(createdAt)}
        </StyledNotificationTimestamp>
      </Toast.Header>
      <Toast.Body>
        <Markdown text={message} />
      </Toast.Body>
    </StyledToast>
  );
};

export default AnnouncementToast;
