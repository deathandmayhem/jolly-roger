import Toast from "react-bootstrap/Toast";
import styled from "styled-components";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import Markdown from "./Markdown";

const StyledNotificationTimestamp = styled.small`
  text-align: end;
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
    <Toast className={className} onClose={onClose}>
      <Toast.Header closeButton={!!onClose}>
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
