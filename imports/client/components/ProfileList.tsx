import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { MouseEvent } from "react";
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ButtonGroup, OverlayTrigger } from "react-bootstrap";
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
import useFocusRefOnFindHotkey from "../hooks/useFocusRefOnFindHotkey";
import Avatar from "./Avatar";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import puzzlesForHunt from "../../lib/publications/puzzlesForHunt";
import Puzzles, { PuzzleType } from "../../lib/models/Puzzles";
import RelativeTime from "./RelativeTime";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons";
import { shortCalendarTimeFormat } from "../../lib/calendarTimeFormat";

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

const StatusDiv = styled.div`
  margin-left: 0.5rem;
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

const UserStatusBadge = React.memo(({
  statusObj,
  huntId,
  huntPuzzles,
}: {
  statusObj: Record<string, any> | null;
  huntId: string | undefined;
  huntPuzzles: PuzzleType[];
}) => {

  if (!huntId) {
    // we don't show statuses on the all list
    return
  }

  if (!statusObj) {
    // we should display users as offline if we don't have data on them
    return <StatusDiv>
      <OverlayTrigger placement="top" overlay={<Tooltip>Offline<br/>(not seen in last four days)</Tooltip>}>
          <ButtonGroup size="sm">
              <Button
              variant='outline-secondary'
              >
                Offline
              </Button>
          </ButtonGroup>
      </OverlayTrigger>
    </StatusDiv>;
  }

  const [lastSeen, setLastSeen] = useState<Date | null>(statusObj?.status?.at || null);
  const [lastPuzzle, setLastPuzzle] = useState<Date | null>(statusObj?.puzzleStatus?.at || null);
  const [timeNow, setTimeNow] = useState<Date | null>(new Date() || null);
  const statusDebounceThreshold = new Date(Date.now() - 2 * 60 * 1000);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLastSeen(statusObj?.status?.at || null);  // Update state every second
      setLastPuzzle(statusObj?.puzzleStatus?.at || null);
      setTimeNow(new Date());
    }, 1000); // Update every 1000ms (1 second)

    return () => clearInterval(intervalId);
  }, [statusObj]);

  const lastStatusRecently = lastSeen && lastSeen >= statusDebounceThreshold;
  const lastPuzzleRecently = lastPuzzle && lastPuzzle >= statusDebounceThreshold;
  const lastSeenRecently = lastStatusRecently || lastPuzzleRecently;

  const statusDisplay = useMemo(() => {
    const userStatus = statusObj?.status?.status;
    const puzzleStatus = statusObj?.puzzleStatus?.status;
    const puzzleId = statusObj?.puzzleStatus?.puzzle;
    const puzzleName = puzzleId ? huntPuzzles[puzzleId] : null;

    const statusString = (userStatus === 'offline' && !lastSeenRecently) ? 'Offline' : (userStatus === 'away' && !lastSeenRecently) ? 'Away' : 'Online';
    const puzzleStatusString = (puzzleStatus === 'offline' && !lastPuzzleRecently) ? 'Offline' : (puzzleStatus === 'away' && !lastPuzzleRecently) ? 'Away' : 'Online';
    const puzzleLabel =
      <span><strong><FontAwesomeIcon icon={faPuzzlePiece} fixedWidth />&nbsp;
      {puzzleName}</strong>
      { puzzleStatus !== 'online' && lastPuzzle ? (<span> <RelativeTime
      date={lastPuzzle}
      minimumUnit="second"
      maxElements={1}
    /></span>) : null } </span>;
    const tooltip = <span> {statusString}
    {
      userStatus !== 'online' ? (
        <span>, last seen: {shortCalendarTimeFormat(lastSeen)}&nbsp;(<RelativeTime
          date={lastSeen}
          minimumUnit="second"
          maxElements={1}
        />)</span>
      ) : null
    }
    {
      puzzleStatus !== 'online' && lastPuzzle ? (
        ', last active on puzzle: ' + shortCalendarTimeFormat(lastPuzzle)
      ) : lastPuzzle ? ', currently active on puzzle' : null
    }
    </span>;

    return (
      <StatusDiv>
        <OverlayTrigger placement="top" overlay={<Tooltip>{tooltip}</Tooltip>}>
          <ButtonGroup size="sm">
            <Button variant={statusString === 'Online' ? 'success' : statusString === 'Away' ? 'warning' : 'secondary'}> {/* Button JSX */}
            {
              statusString === 'Online' ? (
                <strong>{statusString}</strong>
               ): (<span>{statusString}</span>)
            }
            </Button>
            {
            puzzleId ? (
              <Button
                variant={puzzleStatusString === 'Online' ? 'success' : puzzleStatusString === 'Away' ? 'warning' : 'secondary'}
                href={`/hunts/${huntId}/puzzles/${puzzleId}`}
              >
                {puzzleLabel}
              </Button>
            ) : null
            }
          </ButtonGroup>
        </OverlayTrigger>
      </StatusDiv>
    );
  }, [
    statusObj, lastSeenRecently, lastPuzzleRecently, lastSeen, lastPuzzle, huntPuzzles, timeNow,
  ]);

  return statusDisplay;
});

const ProfileList = ({
  hunt,
  canInvite,
  canSyncDiscord,
  canMakeOperator,
  canUpdateHuntInvitationCode,
  users,
  roles,
  invitationCode,
  userStatuses,
}: {
  hunt?: HuntType;
  canInvite?: boolean;
  canSyncDiscord?: boolean;
  canMakeOperator?: boolean;
  canUpdateHuntInvitationCode?: boolean;
  users: Meteor.User[];
  roles?: Record<string, string[]>;
  invitationCode?: string;
  userStatuses?: Record<string, Record<string, Record<string, any>>>;
}) => {

  const [searchString, setSearchString] = useState<string>("");

  const searchBarRef = useRef<HTMLInputElement>(null); // Wrong type but I should fix it
  useFocusRefOnFindHotkey(searchBarRef);

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

    const invitationUrl = Meteor.absoluteUrl(`/join/${invitationCode}`);

    return (
      <p>
        Invitation link:{" "}
        <StyledCopyToClipboardButton
          tooltipId={`invitation-code-${invitationCode}`}
          text={invitationUrl}
          variant="link"
          aria-label="Copy"
        >
          <FontAwesomeIcon icon={faCopy} fixedWidth />
        </StyledCopyToClipboardButton>
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

  const huntId = hunt?._id;

  const huntPuzzlesStatus = useTypedSubscribe(puzzlesForHunt, {huntId});
  const huntPuzzlesLoading = huntPuzzlesStatus();

  const huntPuzzles: PuzzleType[] | [] = useTracker(
    () => huntPuzzlesLoading ? [] : Puzzles.find({hunt: huntId}).fetch().reduce((arr, puz)=>{
      arr[puz._id] = puz.title;
      return arr;
    }, {}));

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
          const userStatus = userStatuses?.[user._id];

          return (
            <ListGroupItem
              key={user._id}
              className="p-1"
            >
              <ListItemContainer>
                <ImageBlock>
                  <Avatar {...user} size={40} />
                </ImageBlock>
                <Link to={
                hunt
                  ? `/hunts/${hunt._id}/hunters/${user._id}`
                  : `/users/${user._id}`
              }>
                {name}
                </Link>
                <UserStatusBadge
                statusObj={userStatus}
                huntId={huntId}
                huntPuzzles={huntPuzzles}
                />
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
