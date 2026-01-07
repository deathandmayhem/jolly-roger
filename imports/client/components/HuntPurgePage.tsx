import { useCallback, useRef } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import FormGroup from "react-bootstrap/FormGroup";
import { Navigate, useParams } from "react-router-dom";
import isAdmin from "../../lib/isAdmin";
import purgeHunt from "../../methods/purgeHunt";
import { useBreadcrumb } from "../hooks/breadcrumb";
import ActionButtonRow from "./ActionButtonRow";
import type { ModalFormHandle } from "./ModalForm";
import ModalForm from "./ModalForm";

const HuntPurgePage = () => {
  const huntId = useParams<{ huntId: string }>().huntId;

  useBreadcrumb({
    title: "Purge Hunt",
    path: `/hunts/${huntId}/purge`,
  });

  const purgeHuntRef = useRef<ModalFormHandle>(null);

  const showPurgeHuntModal = useCallback(() => {
    if (purgeHuntRef.current) {
      purgeHuntRef.current.show();
    }
  }, []);

  const doPurgeHuntContent = useCallback(
    (callback: () => void) => {
      purgeHunt.call({ huntId }, callback);
    },
    [huntId],
  );

  if (!isAdmin(Meteor.user())) {
    return <Navigate to={`/hunts/${huntId}/puzzles`} />;
  }

  return (
    <Container>
      <ModalForm
        ref={purgeHuntRef}
        title="Purge Hunt content?"
        submitLabel="Purge"
        submitStyle="danger"
        onSubmit={doPurgeHuntContent}
      >
        <p>Are you sure you want to purge all content from this Hunt?</p>
        <p>
          This will permanently delete all objects (puzzles, tags, messages,
          etc.) associated with this Hunt, but keep the Hunt itselt, as well as
          any users.
        </p>
        <Alert variant="danger">This action cannot be undone.</Alert>
      </ModalForm>

      <h1>Purge hunt</h1>

      <p>Warning: this will delete all content!</p>

      <Form>
        <ActionButtonRow>
          <FormGroup className="mb-3">
            <Button variant="danger" onClick={showPurgeHuntModal}>
              Reset Hunt
            </Button>
          </FormGroup>
        </ActionButtonRow>
      </Form>
    </Container>
  );
};

export default HuntPurgePage;
