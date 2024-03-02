import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { MouseEvent } from "react";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import InputGroup from "react-bootstrap/InputGroup";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Modal from "react-bootstrap/Modal";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { formatDiscordName } from "../../lib/discord";
import isAdmin from "../../lib/isAdmin";
import type { HuntType } from "../../lib/models/Hunts";
import { userIsOperatorForHunt } from "../../lib/permission_stubs";
import clearHuntInvitationCode from "../../methods/clearHuntInvitationCode";
import demoteOperator from "../../methods/demoteOperator";
import generateHuntInvitationCode from "../../methods/generateHuntInvitationCode";
import promoteOperator from "../../methods/promoteOperator";
import syncHuntDiscordRole from "../../methods/syncHuntDiscordRole";
import Avatar from "./Avatar";

const ProfilesSummary = styled.div`
  text-align: right;
`;

const ListItemContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const ImageBlock = styled.div`
  width: 40px;
  height: 40px;
  flex: none;
  margin-right: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const OperatorBox = styled.div`
  margin-left: auto;
  padding-right: 0.5rem;

  * {
    margin: 0 0.25rem;
  }
`;

type OperatorModalHandle = {
  show(): void;
};

const PromoteOperatorModal = React.forwardRef(
  (
    { user, huntId }: { user: Meteor.User; huntId: string },
    forwardedRef: React.Ref<OperatorModalHandle>,
  ) => {
    const [visible, setVisible] = useState(true);
    const show = useCallback(() => setVisible(true), []);
    const hide = useCallback(() => setVisible(false), []);
    useImperativeHandle(forwardedRef, () => ({ show }), [show]);

    const [disabled, setDisabled] = useState(false);
    const [error, setError] = useState<Error>();
    const clearError = useCallback(() => setError(undefined), []);

    const promote = useCallback(() => {
      promoteOperator.call({ targetUserId: user._id, huntId }, (e) => {
        setDisabled(false);
        if (e) {
          setError(e);
        } else {
          hide();
        }
      });
      setDisabled(true);
    }, [huntId, hide, user._id]);

    const modal = (
      <Modal show={visible} onHide={hide}>
        <Modal.Header closeButton>
          <Modal.Title>Promote Operator</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to make <strong>{user.displayName}</strong> an
            operator?
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
          <Button variant="danger" onClick={promote} disabled={disabled}>
            Promote
          </Button>
        </Modal.Footer>
      </Modal>
    );

    return createPortal(modal, document.body);
  },
);

const DemoteOperatorModal = React.forwardRef(
  (
    { user, huntId }: { user: Meteor.User; huntId: string },
    forwardedRef: React.Ref<OperatorModalHandle>,
  ) => {
    const [visible, setVisible] = useState(true);
    const show = useCallback(() => setVisible(true), []);
    const hide = useCallback(() => setVisible(false), []);
    useImperativeHandle(forwardedRef, () => ({ show }), [show]);

    const [disabled, setDisabled] = useState(false);
    const [error, setError] = useState<Error>();
    const clearError = useCallback(() => setError(undefined), []);

    const demote = useCallback(() => {
      demoteOperator.call({ targetUserId: user._id, huntId }, (e) => {
        setDisabled(false);
        if (e) {
          setError(e);
        } else {
          hide();
        }
      });
      setDisabled(true);
    }, [huntId, hide, user._id]);

    const modal = (
      <Modal show={visible} onHide={hide}>
        <Modal.Header closeButton>
          <Modal.Title>Demote Operator</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to demote <strong>{user.displayName}</strong>?
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
          <Button variant="danger" onClick={demote} disabled={disabled}>
            Demote
          </Button>
        </Modal.Footer>
      </Modal>
    );

    return createPortal(modal, document.body);
  },
);

const OperatorControls = ({
  user,
  hunt,
}: {
  user: Meteor.User;
  hunt: HuntType;
}) => {
  const self = useTracker(() => user._id === Meteor.userId(), [user._id]);
  const { userIsOperator, userIsAdmin } = useTracker(() => {
    return {
      userIsOperator: userIsOperatorForHunt(user, hunt),
      userIsAdmin: isAdmin(user),
    };
  }, [user, hunt]);

  const [renderPromoteModal, setRenderPromoteModal] = useState(false);
  const promoteModalRef = useRef<OperatorModalHandle>(null);
  const [renderDemoteModal, setRenderDemoteModal] = useState(false);
  const demoteModalRef = useRef<OperatorModalHandle>(null);

  const showPromoteModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (renderPromoteModal && promoteModalRef.current) {
        promoteModalRef.current.show();
      } else {
        setRenderPromoteModal(true);
      }
    },
    [renderPromoteModal, promoteModalRef],
  );
  const showDemoteModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (renderDemoteModal && demoteModalRef.current) {
        demoteModalRef.current.show();
      } else {
        setRenderDemoteModal(true);
      }
    },
    [renderDemoteModal],
  );

  const preventPropagation = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <OperatorBox onClick={preventPropagation}>
      {renderPromoteModal && (
        <PromoteOperatorModal
          ref={promoteModalRef}
          user={user}
          huntId={hunt._id}
        />
      )}
      {renderDemoteModal && (
        <DemoteOperatorModal
          ref={demoteModalRef}
          user={user}
          huntId={hunt._id}
        />
      )}
      {userIsAdmin && <Badge bg="success">Admin</Badge>}
      {userIsOperator ? (
        <>
          {!self && (
            <Button size="sm" variant="warning" onClick={showDemoteModal}>
              Demote
            </Button>
          )}
          <Badge bg="info">Operator</Badge>
        </>
      ) : (
        <Button size="sm" variant="warning" onClick={showPromoteModal}>
          Make operator
        </Button>
      )}
    </OperatorBox>
  );
};

const ProfileList = ({
  hunt,
  canInvite,
  canSyncDiscord,
  canMakeOperator,
  canUpdateHuntInvitationCode,
  users,
  roles,
}: {
  hunt?: HuntType;
  canInvite?: boolean;
  canSyncDiscord?: boolean;
  canMakeOperator?: boolean;
  canUpdateHuntInvitationCode?: boolean;
  users: Meteor.User[];
  roles?: Record<string, string[]>;
}) => {
  const [searchString, setSearchString] = useState<string>("");

  const searchBarRef = useRef<HTMLInputElement>(null); // Wrong type but I should fix it

  const maybeStealCtrlF = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      const node = searchBarRef.current;
      if (node) {
        node.focus();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", maybeStealCtrlF);
    return () => {
      window.removeEventListener("keydown", maybeStealCtrlF);
    };
  }, [maybeStealCtrlF]);

  // The type annotation on FormControl is wrong here - the event is from the
  // input element, not the FormControl React component
  const onSearchStringChange: NonNullable<FormControlProps["onChange"]> =
    useCallback((e) => {
      setSearchString(e.currentTarget.value);
    }, []);

  const matcher = useMemo(() => {
    const searchKeys = searchString.split(" ");
    const toMatch = searchKeys.filter(Boolean).map((s) => s.toLowerCase());

    const isInteresting = (user: Meteor.User) => {
      // A user is interesting if for every search key, that search key matches
      // one of their fields.
      return toMatch.every((searchKey) => {
        /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
        return (
          user.displayName?.toLowerCase().includes(searchKey) ||
          user.emails?.some((e) =>
            e.address.toLowerCase().includes(searchKey),
          ) ||
          user.phoneNumber?.toLowerCase().includes(searchKey) ||
          formatDiscordName(user.discordAccount)?.includes(searchKey) ||
          roles?.[user._id]?.some((role) =>
            role.toLowerCase().includes(searchKey),
          )
        );
        /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
      });
    };

    return isInteresting;
  }, [searchString, roles]);

  const clearSearch = useCallback(() => {
    setSearchString("");
  }, []);

  const syncDiscord = useCallback(() => {
    if (!hunt) {
      return;
    }

    syncHuntDiscordRole.call({ huntId: hunt._id });
  }, [hunt]);

  const syncDiscordButton = useMemo(() => {
    if (!hunt || !canSyncDiscord) {
      return null;
    }

    return (
      <FormGroup className="mb-3">
        <Button variant="warning" onClick={syncDiscord}>
          Sync this hunt&apos;s Discord role
        </Button>
        <FormText>
          (Click this if people are reporting that they can&apos;t access
          hunt-specific channels)
        </FormText>
      </FormGroup>
    );
  }, [hunt, canSyncDiscord, syncDiscord]);

  const invitationLink = useMemo(() => {
    if (!hunt || !canInvite || !hunt.invitationCode) {
      return null;
    }

    return (
      <p>
        Invitation link:{" "}
        <a href={`/join/${hunt.invitationCode}`}>
          {`${window.location.origin}/join/${hunt.invitationCode}`}
        </a>
      </p>
    );
  }, [hunt, canInvite]);

  const generateInvitationLink = useCallback(() => {
    if (!hunt) {
      return;
    }

    generateHuntInvitationCode.call({ huntId: hunt._id });
  }, [hunt]);

  const clearInvitationLink = useCallback(() => {
    if (!hunt) {
      return;
    }

    clearHuntInvitationCode.call({ huntId: hunt._id });
  }, [hunt]);

  const invitationLinkManagementButtons = useMemo(() => {
    if (!hunt || !canUpdateHuntInvitationCode) {
      return null;
    }

    return (
      <FormGroup className="mb-3">
        <Button variant="info" onClick={generateInvitationLink}>
          {hunt.invitationCode
            ? "Regenerate invitation link"
            : "Generate invitation link"}
        </Button>
        {hunt.invitationCode && (
          <Button variant="info" className="ms-1" onClick={clearInvitationLink}>
            Disable invitation link
          </Button>
        )}
        <FormText>
          Manage the public invitation link that can be used by anyone to join
          this hunt
        </FormText>
      </FormGroup>
    );
  }, [
    hunt,
    canUpdateHuntInvitationCode,
    clearInvitationLink,
    generateInvitationLink,
  ]);

  const inviteToHuntItem = useMemo(() => {
    if (!hunt || !canInvite) {
      return null;
    }

    return (
      <ListGroupItem
        action
        as={Link}
        to={`/hunts/${hunt._id}/hunters/invite`}
        className="p-1"
      >
        <ListItemContainer>
          <ImageBlock>
            <FontAwesomeIcon icon={faPlus} />
          </ImageBlock>
          <strong>Invite someone...</strong>
        </ListItemContainer>
      </ListGroupItem>
    );
  }, [hunt, canInvite]);

  const globalInfo = useMemo(() => {
    if (hunt) {
      return null;
    }

    return (
      <Alert variant="info">
        This shows everyone registered on Jolly Roger, not just those hunting in
        this year&apos;s Mystery Hunt. For that, go to the hunt page and click
        on &quot;Hunters&quot;.
      </Alert>
    );
  }, [hunt]);

  const matching = users.filter(matcher);
  return (
    <div>
      <h1>List of hunters</h1>
      <ProfilesSummary>Total hunters: {users.length}</ProfilesSummary>

      {syncDiscordButton}

      {invitationLink}
      {invitationLinkManagementButtons}

      <FormGroup className="mb-3">
        <FormLabel htmlFor="jr-profile-list-search">Search</FormLabel>
        <InputGroup>
          <FormControl
            id="jr-profile-list-search"
            type="text"
            ref={searchBarRef}
            placeholder="search by name, email, phone, Discord..."
            value={searchString}
            onChange={onSearchStringChange}
          />
          <Button variant="secondary" onClick={clearSearch}>
            <FontAwesomeIcon icon={faEraser} />
          </Button>
        </InputGroup>
      </FormGroup>

      {globalInfo}

      <ListGroup>
        {inviteToHuntItem}
        {matching.map((user) => {
          const name = user.displayName ?? "<no name provided>";
          return (
            <ListGroupItem
              key={user._id}
              action
              as={Link}
              to={
                hunt
                  ? `/hunts/${hunt._id}/hunters/${user._id}`
                  : `/users/${user._id}`
              }
              className="p-1"
            >
              <ListItemContainer>
                <ImageBlock>
                  <Avatar {...user} size={40} />
                </ImageBlock>
                {name}
                {hunt && canMakeOperator && (
                  <OperatorControls hunt={hunt} user={user} />
                )}
              </ListItemContainer>
            </ListGroupItem>
          );
        })}
      </ListGroup>
    </div>
  );
};

export default ProfileList;
