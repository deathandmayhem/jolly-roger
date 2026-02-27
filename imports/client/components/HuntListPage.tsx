import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faBomb } from "@fortawesome/free-solid-svg-icons/faBomb";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { MouseEvent, ReactNode } from "react";
import React, {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Modal from "react-bootstrap/Modal";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { LinkContainer } from "react-router-bootstrap";
import { Link } from "react-router-dom";
import type { HuntType } from "../../lib/models/Hunts";
import Hunts from "../../lib/models/Hunts";
import {
  userHasPermissionForAction,
  userMayCreateHunt,
  userMayUpdateHunt,
} from "../../lib/permission_stubs";
import huntsAll from "../../lib/publications/huntsAll";
import createFixtureHunt from "../../methods/createFixtureHunt";
import destroyHunt from "../../methods/destroyHunt";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import HuntPurgeModal from "./HuntPurgeModal";
import type { ModalFormHandle } from "./ModalForm";
import ModalForm from "./ModalForm";

const Hunt = React.memo(({ hunt }: { hunt: HuntType }) => {
  const huntId = hunt._id;

  const { canUpdate, canDestroy, canPurge } = useTracker(() => {
    return {
      canUpdate: userMayUpdateHunt(Meteor.user(), hunt),

      // Because we delete by setting the deleted flag, you only need
      // update to "remove" something
      canDestroy: userMayUpdateHunt(Meteor.user(), hunt),
      canPurge: userHasPermissionForAction(Meteor.user(), hunt, "purgeHunt"),
    };
  }, [hunt]);

  const deleteModalRef = useRef<ModalFormHandle>(null);
  const purgeModalRef = useRef<ModalFormHandle>(null);

  const onDelete = useCallback(
    (callback: () => void) => {
      destroyHunt.call({ huntId }, callback);
    },
    [huntId],
  );

  const showDeleteModal = useCallback(() => {
    if (deleteModalRef.current) {
      deleteModalRef.current.show();
    }
  }, []);

  const showPurgeModal = useCallback(() => {
    if (purgeModalRef.current) {
      purgeModalRef.current.show();
    }
  }, []);

  const { t } = useTranslation();
  return (
    <li>
      <ModalForm
        ref={deleteModalRef}
        title={t("huntList.delete.confirm.title", "Delete Hunt")}
        submitLabel={t("huntList.delete.confirm.submit", "Delete")}
        submitStyle="danger"
        onSubmit={onDelete}
      >
        {t(
          "huntList.delete.confirm.text",
          'Are you sure you want to delete "{{huntName}}"? This will additionally delete all puzzles and associated state.',
          { huntName: hunt.name },
        )}
      </ModalForm>
      <HuntPurgeModal ref={purgeModalRef} hunt={hunt} />
      <ButtonGroup size="sm">
        {canUpdate ? (
          <LinkContainer to={`/hunts/${huntId}/edit`}>
            <Button
              as="a"
              variant="outline-secondary"
              title={`${t("huntList.edit.title", "Edit hunt")}...`}
            >
              <FontAwesomeIcon icon={faEdit} />
            </Button>
          </LinkContainer>
        ) : undefined}
        {canPurge ? (
          <Button
            onClick={showPurgeModal}
            variant="danger"
            title={`${t("huntList.purge.title", "Purge hunt contents")}...`}
          >
            <FontAwesomeIcon icon={faBomb} />
          </Button>
        ) : undefined}
        {canDestroy ? (
          <Button
            onClick={showDeleteModal}
            variant="danger"
            title={`${t("huntList.delete.title", "Delete hunt")}...`}
          >
            <FontAwesomeIcon icon={faMinus} />
          </Button>
        ) : undefined}
      </ButtonGroup>{" "}
      <Link to={`/hunts/${huntId}`}>{hunt.name}</Link>
    </li>
  );
});

type CreateFixtureModalFormHandle = {
  show: () => void;
};

const CreateFixtureModal = ({
  ref,
}: {
  ref: React.Ref<CreateFixtureModalFormHandle>;
}) => {
  const [visible, setVisible] = useState(true);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  useImperativeHandle(ref, () => ({ show }), [show]);

  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<Error>();
  const clearError = useCallback(() => setError(undefined), []);

  const createFixture = useCallback(() => {
    createFixtureHunt.call((e) => {
      setDisabled(false);
      if (e) {
        setError(e);
      } else {
        hide();
      }
    });
    setDisabled(true);
  }, [hide]);

  const modal = (
    <Modal show={visible} onHide={hide}>
      <Modal.Header closeButton>
        <Modal.Title>Create sample hunt</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          If you just want to see what Jolly Roger looks like in action, this
          will create a sample hunt, using data from the 2018 MIT Mystery Hunt
          (&quot;Operation: Head Hunters&quot;).
        </p>
        <p>
          It shows the hunt partially solved (and therefore includes spoilers).
          However, this provides an opportunity to demonstrate how Jolly Roger
          can handle complex structures and various puzzle states.
        </p>

        {error && (
          <Alert variant="danger" dismissible onClose={clearError}>
            {error.message}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={hide} disabled={disabled}>
          Cancel
        </Button>
        <Button variant="danger" onClick={createFixture} disabled={disabled}>
          Create sample hunt
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return createPortal(modal, document.body);
};

const HuntListPage = () => {
  const huntsLoading = useTypedSubscribe(huntsAll);
  const loading = huntsLoading();

  const hunts = useTracker(() =>
    Hunts.find({}, { sort: { createdAt: -1 } }).fetch(),
  );
  const { canAdd, myHunts } = useTracker(() => {
    return {
      canAdd: userMayCreateHunt(Meteor.user()),
      myHunts: new Set(Meteor.user()?.hunts),
    };
  }, []);

  const [renderCreateFixtureModal, setRenderCreateFixtureModal] =
    useState(false);
  const createFixtureModalRef = useRef<CreateFixtureModalFormHandle>(null);
  const showCreateFixtureModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (renderCreateFixtureModal && createFixtureModalRef.current) {
        createFixtureModalRef.current.show();
      } else {
        setRenderCreateFixtureModal(true);
      }
    },
    [renderCreateFixtureModal],
  );

  const { t } = useTranslation();
  const body: ReactNode[] = [];
  if (loading) {
    body.push(<div key="loading">{t("common.loading", "Loading")}...</div>);
  } else {
    const joinedHunts: React.JSX.Element[] = [];
    const otherHunts: React.JSX.Element[] = [];
    hunts.forEach((hunt) => {
      const huntTag = <Hunt key={hunt._id} hunt={hunt} />;
      if (myHunts.has(hunt._id)) {
        joinedHunts.push(huntTag);
      } else {
        otherHunts.push(huntTag);
      }
    });

    body.push(
      <h2 key="myhuntsheader">
        {t("huntList.yourHunts", "Hunts you are a member of")}:
      </h2>,
    );
    if (joinedHunts.length > 0) {
      body.push(<ul key="myhunts">{joinedHunts}</ul>);
    } else {
      body.push(
        <div key="nomyhunts">
          {t(
            "huntList.notInAnyHunt",
            "You're not a member of any hunts yet. Consider joining one, or asking an operator to invite you.",
          )}
        </div>,
      );
    }
    body.push(
      <h2 key="otherhuntsheader">
        {t("huntList.otherHunts", "Other hunts")}:
      </h2>,
    );
    if (otherHunts.length > 0) {
      body.push(<ul key="otherhunts">{otherHunts}</ul>);
    } else {
      body.push(
        <div key="nootherhunts">
          {t(
            "huntList.noOtherHunts",
            "There are no other hunts you haven't joined.",
          )}
        </div>,
      );
    }
  }

  return (
    <div>
      <h1>{t("huntList.title", "Hunts")}</h1>
      {canAdd && (
        <>
          <LinkContainer to="/hunts/new">
            <Button as="a" variant="success" size="sm">
              {t("huntList.newHunt", "New hunt")}...
            </Button>
          </LinkContainer>
          {!loading && hunts.length === 0 && (
            <>
              {" "}
              {renderCreateFixtureModal && (
                <CreateFixtureModal ref={createFixtureModalRef} />
              )}
              <Button onClick={showCreateFixtureModal} variant="info" size="sm">
                Create sample hunt
              </Button>
            </>
          )}
        </>
      )}
      {body}
    </div>
  );
};

export default HuntListPage;
