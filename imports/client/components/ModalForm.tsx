import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Spinner } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import type { ModalProps } from "react-bootstrap/Modal";
import Modal from "react-bootstrap/Modal";
import { createPortal } from "react-dom";
import styled from "styled-components";

const StyledModalTitle = styled(Modal.Title)`
  overflow: hidden;
  overflow-wrap: break-word;
  hyphens: auto;
`;

interface ModalFormProps {
  title: string;
  size?: ModalProps["size"];
  submitLabel?: string;
  submitStyle?: string;
  submitDisabled?: boolean;
  onSubmit: (callback: () => void) => void;
  children: React.ReactNode;
}

export type ModalFormHandle = {
  show: () => void;
  hide: () => void;
};

const ModalForm = React.forwardRef(
  (props: ModalFormProps, forwardedRef: React.Ref<ModalFormHandle>) => {
    const [isShown, setIsShown] = useState<boolean>(false);
    const dontTryToHide = useRef<boolean>(false);

    const show = useCallback(() => {
      setIsShown(true);
    }, []);

    const hide = useCallback(() => {
      setIsShown(false);
    }, []);

    useImperativeHandle(forwardedRef, () => ({
      show,
      hide,
    }));

    useEffect(() => {
      dontTryToHide.current = false;
      return () => {
        dontTryToHide.current = true;
      };
    }, []);

    const { onSubmit } = props;
    const submit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(() => {
          // For delete forms, it's possible that the component gets
          // deleted and unmounted before the callback gets called.
          if (!dontTryToHide.current) {
            hide();
          }
        });
      },
      [onSubmit, hide],
    );

    const submitLabel = props.submitLabel ?? "Save";
    const submitStyle = props.submitStyle ?? "primary";

    const modal = (
      <Modal show={isShown} onHide={hide} size={props.size}>
        <form className="form-horizontal" onSubmit={submit}>
          <Modal.Header closeButton>
            <StyledModalTitle>{props.title}</StyledModalTitle>
          </Modal.Header>
          <Modal.Body>{props.children}</Modal.Body>
          <Modal.Footer>
            {props.submitDisabled && (
              <FontAwesomeIcon icon={faPuzzlePiece} spin />
            )}
            <Button
              variant="light"
              onClick={hide}
              disabled={props.submitDisabled}
            >
              Close
            </Button>
            <Button
              variant={submitStyle}
              type="submit"
              disabled={props.submitDisabled}
            >
              {submitLabel}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    );

    return createPortal(modal, document.body);
  },
);

export default ModalForm;
