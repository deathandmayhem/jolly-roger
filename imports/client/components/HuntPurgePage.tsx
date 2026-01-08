import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import type { ModalProps } from "react-bootstrap/Modal";
import Modal from "react-bootstrap/Modal";
import { createPortal } from "react-dom";
import { Navigate, useParams } from "react-router-dom";
import isAdmin from "../../lib/isAdmin";
import Hunts from "../../lib/models/Hunts";
import purgeHunt from "../../methods/purgeHunt";
import purgeHuntDocumentCache from "../../methods/purgeHuntDocumentCache";
import { useBreadcrumb } from "../hooks/breadcrumb";
import ActionButtonRow from "./ActionButtonRow";
import type { ModalFormHandle } from "./ModalForm";
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
const PurgeForm = React.forwardRef(
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
            <Button variant="light" onClick={hide}>
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

const HuntPurgePage = () => {
  const huntId = useParams<{ huntId: string }>().huntId;
  const hunt = Hunts.findOne(huntId);
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(true);

  useBreadcrumb({
    title: "Purge Hunt",
    path: `/hunts/${huntId}/purge`,
  });

  const purgeHuntRef = useRef<ModalFormHandle>(null);
  const purgeCacheRef = useRef<ModalFormHandle>(null);

  const showPurgeHuntModal = useCallback(() => {
    if (purgeHuntRef.current) {
      setSubmitDisabled(true);
      purgeHuntRef.current.show();
    }
  }, []);

  const showPurgeCacheModal = useCallback(() => {
    if (purgeCacheRef.current) {
      setSubmitDisabled(true);
      purgeCacheRef.current.show();
    }
  }, []);

  const doPurgeCacheContent = useCallback(
    (callback: () => void) => {
      purgeHuntDocumentCache.call({ huntId }, callback);
    },
    [huntId],
  );

  const doPurgeHuntContent = useCallback(
    (callback: () => void) => {
      purgeHunt.call({ huntId }, callback);
    },
    [huntId],
  );

  if (!isAdmin(Meteor.user())) {
    return <Navigate to={`/hunts/${huntId}/puzzles`} />;
  }

  const purgeHuntConfirmationModal = (
    <PurgeForm
      ref={purgeHuntRef}
      title="Purge hunt content?"
      submitLabel="Purge"
      submitStyle="danger"
      onSubmit={doPurgeHuntContent}
      submitDisabled={submitDisabled}
    >
      <p>
        Are you sure you want to purge all content from{" "}
        <strong>{hunt?.name}</strong>?
      </p>
      <p>
        This will permanently delete all objects (puzzles, tags, messages, etc.)
        associated with <strong>{hunt?.name}</strong>, but keep the Hunt itself,
        as well as any users and their permissions.
      </p>
      <p>
        This action will not delete any Google Drive content or resources
        associated with <strong>{hunt?.name}</strong> (e.g. in AWS S3).
      </p>
      <Alert variant="danger">This action cannot be undone.</Alert>
      <FormLabel>
        Type <code>{hunt?.name}</code> below to confirm
      </FormLabel>
      <FormControl
        type="text"
        onChange={(e) => {
          setSubmitDisabled(e.currentTarget.value !== hunt?.name);
        }}
      />
    </PurgeForm>
  );

  const purgeCacheConfirmationModal = (
    <PurgeForm
      ref={purgeCacheRef}
      title="Purge hunt document cache?"
      submitLabel="Purge"
      submitStyle="danger"
      onSubmit={doPurgeCacheContent}
      submitDisabled={submitDisabled}
    >
      <p>
        Are you sure you want to purge the document cache for{" "}
        <strong>{hunt?.name}</strong>?
      </p>
      <Alert variant="danger">This action cannot be undone.</Alert>
      <FormLabel>
        Type <code>{hunt?.name}</code> below to confirm
      </FormLabel>
      <FormControl
        type="text"
        onChange={(e) => {
          setSubmitDisabled(e.currentTarget.value !== hunt?.name);
        }}
      />
    </PurgeForm>
  );

  return (
    <Container>
      {purgeCacheConfirmationModal}
      {purgeHuntConfirmationModal}
      <h1>Purge hunt</h1>

      <Alert variant="danger">Warning: this will delete all content!</Alert>

      <Form>
        <ActionButtonRow>
          <FormGroup className="mb-3">
            <Button variant="danger" onClick={showPurgeHuntModal}>
              Reset Hunt
            </Button>
          </FormGroup>
        </ActionButtonRow>
      </Form>
      <h2>Purge document cache</h2>
      <Alert variant="warning">
        Warning: this will delete the hunt's pre-created document cache.
      </Alert>
      <Form>
        <ActionButtonRow>
          <FormGroup className="mb-3">
            <Button variant="danger" onClick={showPurgeCacheModal}>
              Purge Document Cache
            </Button>
          </FormGroup>
        </ActionButtonRow>
      </Form>
    </Container>
  );
};

export default HuntPurgePage;
