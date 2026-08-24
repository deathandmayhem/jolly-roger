import { useCallback } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { ChatMessageContentType } from "../../lib/models/ChatMessages";
import ChatMessage from "./ChatMessage";

const MessagePreviewContainer = styled.div`
  border-left: 3px solid ${({ theme }) => theme.colors.border};
  padding: 6px 10px;
  margin: 12px 0 6px;
  background-color: ${({ theme }) => theme.colors.hoverChatMessageBackground};
  border-radius: 0 4px 4px 0;
  font-size: 14px;
  overflow-wrap: break-word;
`;

export interface DeleteChatMessageModalProps {
  show: boolean;
  messageContent?: ChatMessageContentType;
  displayNames: Map<string, string>;
  selfUserId: string;
  roles: string[];
  onHide: () => void;
  onConfirm: () => void;
}

const DeleteChatMessageModal = ({
  show,
  messageContent,
  displayNames,
  selfUserId,
  roles,
  onHide,
  onConfirm,
}: DeleteChatMessageModalProps) => {
  const { t } = useTranslation();

  const handleConfirm = useCallback(() => {
    onConfirm();
    onHide();
  }, [onConfirm, onHide]);

  if (!show) {
    return null;
  }

  const modal = (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>
          {t("chat.deleteModal.title", "Delete Message")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          {t(
            "chat.deleteModal.confirm",
            "Are you sure you want to delete this message? This action cannot be undone.",
          )}
        </p>
        {messageContent && (
          <MessagePreviewContainer>
            <ChatMessage
              message={messageContent}
              displayNames={displayNames}
              selfUserId={selfUserId}
              roles={roles}
            />
          </MessagePreviewContainer>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t("chat.deleteModal.cancel", "Cancel")}
        </Button>
        <Button variant="danger" onClick={handleConfirm}>
          {t("chat.deleteModal.delete", "Delete")}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return createPortal(modal, document.body);
};

export default DeleteChatMessageModal;
