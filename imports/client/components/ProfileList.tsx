import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ComponentPropsWithRef, FC, MouseEvent } from "react";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { OverlayTrigger } from "react-bootstrap";
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
import Tooltip from "react-bootstrap/Tooltip";
import CopyToClipboard from "react-copy-to-clipboard";
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

const StyledLinkButton: FC<ComponentPropsWithRef<typeof Button>> = styled(
  Button,
)`
  padding: 0;
  vertical-align: baseline;
`;

type ModalHandle = {
  show(): void;
};

const ConfirmationModal = React.forwardRef(
  (
    {
      title,
      body,
      action,
      performAction,
    }: {
      title: string;
      body: string | React.JSX.Element;
      action: string;
      performAction: (callback: (e?: Error) => void) => void;
    },
    forwardedRef: React.Ref<ModalHandle>,
  ) => {
    const [visible, setVisible] = useState(true);
    const [error, setError] = useState<Error>();
    const clearError = useCallback(() => setError(undefined), []);
    const show = useCallback(() => setVisible(true), []);
    const hide = useCallback(() => {
      clearError();
      setVisible(false);
    }, [clearError]);
    useImperativeHandle(forwardedRef, () => ({ show }), [show]);

    const [disabled, setDisabled] = useState(false);

    const onActionClicked = useCallback(() => {
      performAction((e) => {
        setDisabled(false);
        if (e) {
          setError(e);
        } else {
          hide();
        }
      });
      setDisabled(true);
    }, [performAction, hide]);

    const modal = (
      <Modal show={visible} onHide={hide}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{body}</p>
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
          <Button
            variant="danger"
            onClick={onActionClicked}
            disabled={disabled}
          >
            {action}
          </Button>
        </Modal.Footer>
      </Modal>
    );

    return createPortal(modal, document.body);
  },
);

const PromoteOperatorModal = ({
  user,
  huntId,
  forwardedRef,
}: {
  user: Meteor.User;
  huntId: string;
  forwardedRef: React.Ref<ModalHandle>;
}) => {
  const performAction = useCallback(
    (callback: (e?: Error) => void) => {
      promoteOperator.call({ targetUserId: user._id, huntId }, callback);
    },
    [huntId, user._id],
  );

  const body = (
    <>
      Are you sure you want to make <strong>{user.displayName}</strong> an
      operator?
    </>
  );

  return (
    <ConfirmationModal
      title="Promote Operator"
      body={body}
      action="Promote"
      performAction={performAction}
      ref={forwardedRef}
    />
  );
};

const DemoteOperatorModal = ({
  user,
  huntId,
  forwardedRef,
}: {
  user: Meteor.User;
  huntId: string;
  forwardedRef: React.Ref<ModalHandle>;
}) => {
  const performAction = useCallback(
    (callback: (e?: Error) => void) => {
      demoteOperator.call({ targetUserId: user._id, huntId }, callback);
    },
    [huntId, user._id],
  );

  const body = (
    <>
      Are you sure you want to demote <strong>{user.displayName}</strong>?
    </>
  );

  return (
    <ConfirmationModal
      title="Demote Operator"
      body={body}
      action="Demote"
      performAction={performAction}
      ref={forwardedRef}
    />
  );
};

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
  const promoteModalRef = useRef<ModalHandle>(null);
  const [renderDemoteModal, setRenderDemoteModal] = useState(false);
  const demoteModalRef = useRef<ModalHandle>(null);

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
          forwardedRef={promoteModalRef}
          user={user}
          huntId={hunt._id}
        />
      )}
      {renderDemoteModal && (
        <DemoteOperatorModal
          forwardedRef={demoteModalRef}
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

const GenerateInvitationLinkModal = ({
  huntId,
  isRegenerate,
  forwardedRef,
}: {
  huntId: string;
  isRegenerate: boolean;
  forwardedRef: React.Ref<ModalHandle>;
}) => {
  const performAction = useCallback(
    (callback: (e?: Error) => void) => {
      generateHuntInvitationCode.call({ huntId }, callback);
    },
    [huntId],
  );

  return (
    <ConfirmationModal
      title={
        isRegenerate ? "Regenerate Invitation Link" : "Generate Invitation Link"
      }
      body={
        isRegenerate
          ? "Are you sure you want to regenerate the invitation link to this hunt? The current link will no longer be valid."
          : "Generate an invitation link to this hunt? Anyone with access to invite users will see this link, and anyone with the link will be able to join."
      }
      action={isRegenerate ? "Regenerate link" : "Generate link"}
      performAction={performAction}
      ref={forwardedRef}
    />
  );
};

const DisableInvitationLinkModal = ({
  huntId,
  forwardedRef,
}: {
  huntId: string;
  forwardedRef: React.Ref<ModalHandle>;
}) => {
  const performAction = useCallback(
    (callback: (e?: Error) => void) => {
      clearHuntInvitationCode.call({ huntId }, callback);
    },
    [huntId],
  );

  return (
    <ConfirmationModal
      title="Disable Invitation Link"
      body="Are you sure you want to disable the invitation link to this hunt? The current link will no longer be valid."
      action="Disable link"
      performAction={performAction}
      ref={forwardedRef}
    />
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
  invitationCode,
}: {
  hunt?: HuntType;
  canInvite?: boolean;
  canSyncDiscord?: boolean;
  canMakeOperator?: boolean;
  canUpdateHuntInvitationCode?: boolean;
  users: Meteor.User[];
  roles?: Record<string, string[]>;
  invitationCode?: string;
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

  const [
    renderGenerateInvitationLinkModal,
    setRenderGenerateInvitationLinkModal,
  ] = useState(false);
  const generateInvitationLinkModalRef = useRef<ModalHandle>(null);

  const showGenerateInvitationLinkModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (
        renderGenerateInvitationLinkModal &&
        generateInvitationLinkModalRef.current
      ) {
        generateInvitationLinkModalRef.current.show();
      } else {
        setRenderGenerateInvitationLinkModal(true);
      }
    },
    [renderGenerateInvitationLinkModal, generateInvitationLinkModalRef],
  );

  const [
    renderDisableInvitationLinkModal,
    setRenderDisableInvitationLinkModal,
  ] = useState(false);
  const disableInvitationLinkModalRef = useRef<ModalHandle>(null);

  const showDisableInvitationLinkModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (
        renderDisableInvitationLinkModal &&
        disableInvitationLinkModalRef.current
      ) {
        disableInvitationLinkModalRef.current.show();
      } else {
        setRenderDisableInvitationLinkModal(true);
      }
    },
    [renderDisableInvitationLinkModal, disableInvitationLinkModalRef],
  );

  const invitationLink = useMemo(() => {
    if (!hunt || !canInvite || !invitationCode) {
      return null;
    }

    const copyTooltip = <Tooltip>Copy to clipboard</Tooltip>;

    const invitationUrl = Meteor.absoluteUrl(`/join/${invitationCode}`);

    return (
      <p>
        Invitation link:{" "}
        <OverlayTrigger placement="top" overlay={copyTooltip}>
          {({ ref, ...triggerHandler }) => (
            <CopyToClipboard text={invitationUrl} {...triggerHandler}>
              <StyledLinkButton ref={ref} variant="link" aria-label="Copy">
                <FontAwesomeIcon icon={faCopy} fixedWidth />
              </StyledLinkButton>
            </CopyToClipboard>
          )}
        </OverlayTrigger>{" "}
        {invitationUrl}
      </p>
    );
  }, [hunt, canInvite, invitationCode]);

  const invitationLinkManagementButtons = useMemo(() => {
    if (!hunt || !canUpdateHuntInvitationCode) {
      return null;
    }

    return (
      <FormGroup className="mb-3">
        {renderGenerateInvitationLinkModal && (
          <GenerateInvitationLinkModal
            forwardedRef={generateInvitationLinkModalRef}
            huntId={hunt._id}
            isRegenerate={typeof invitationCode !== "undefined"}
          />
        )}
        {renderDisableInvitationLinkModal && (
          <DisableInvitationLinkModal
            forwardedRef={disableInvitationLinkModalRef}
            huntId={hunt._id}
          />
        )}
        <Button variant="info" onClick={showGenerateInvitationLinkModal}>
          {invitationCode
            ? "Regenerate invitation link"
            : "Generate invitation link"}
        </Button>
        {invitationCode && (
          <Button
            variant="info"
            className="ms-1"
            onClick={showDisableInvitationLinkModal}
          >
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
    invitationCode,
    renderGenerateInvitationLinkModal,
    showGenerateInvitationLinkModal,
    renderDisableInvitationLinkModal,
    showDisableInvitationLinkModal,
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
