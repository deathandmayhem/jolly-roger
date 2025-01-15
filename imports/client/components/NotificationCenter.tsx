import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faKey } from "@fortawesome/free-solid-svg-icons/faKey";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";
import Tooltip from "react-bootstrap/Tooltip";
import { Link } from "react-router-dom";
import ReactTextareaAutosize from "react-textarea-autosize";
import styled from "styled-components";
import Flags from "../../Flags";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import isAdmin from "../../lib/isAdmin";
import { indexedById } from "../../lib/listUtils";
import Announcements from "../../lib/models/Announcements";
import type { AnnouncementType } from "../../lib/models/Announcements";
import type { BookmarkNotificationType } from "../../lib/models/BookmarkNotifications";
import BookmarkNotifications from "../../lib/models/BookmarkNotifications";
import type { ChatNotificationType } from "../../lib/models/ChatNotifications";
import ChatNotifications from "../../lib/models/ChatNotifications";
import Guesses from "../../lib/models/Guesses";
import type { GuessType } from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import type { HuntType } from "../../lib/models/Hunts";
import PendingAnnouncements from "../../lib/models/PendingAnnouncements";
import type { PuzzleNotificationType } from "../../lib/models/PuzzleNotifications";
import PuzzleNotifications from "../../lib/models/PuzzleNotifications";
import Puzzles from "../../lib/models/Puzzles";
import type { PuzzleType } from "../../lib/models/Puzzles";
import { huntsUserIsOperatorFor } from "../../lib/permission_stubs";
import bookmarkNotificationsForSelf from "../../lib/publications/bookmarkNotificationsForSelf";
import pendingAnnouncementsForSelf from "../../lib/publications/pendingAnnouncementsForSelf";
import pendingGuessesForSelf from "../../lib/publications/pendingGuessesForSelf";
import puzzleNotificationsForSelf from "../../lib/publications/puzzleNotificationsForSelf";
import configureEnsureGoogleScript from "../../methods/configureEnsureGoogleScript";
import dismissBookmarkNotification from "../../methods/dismissBookmarkNotification";
import dismissChatNotification from "../../methods/dismissChatNotification";
import dismissPendingAnnouncement from "../../methods/dismissPendingAnnouncement";
import dismissPuzzleNotification from "../../methods/dismissPuzzleNotification";
import setGuessState from "../../methods/setGuessState";
import { guessURL } from "../../model-helpers";
import GoogleScriptInfo from "../GoogleScriptInfo";
import { useOperatorActionsHidden } from "../hooks/persisted-state";
import { useBlockReasons } from "../hooks/useBlockUpdate";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import AnnouncementToast from "./AnnouncementToast";
import ChatMessage from "./ChatMessage";
import CopyToClipboardButton from "./CopyToClipboardButton";
import Markdown from "./Markdown";
import PuzzleAnswer from "./PuzzleAnswer";
import SpinnerTimer from "./SpinnerTimer";

// How long to keep showing guess notifications after actioning.
// Note that this cannot usefully exceed the linger period implemented by the
// subscription that fetches the data from imports/server/guesses.ts
const LINGER_PERIOD = 4000;

const GuessInfoDiv = styled.div`
  font-size: 14px;
`;

const StyledNotificationActionBar = styled.ul`
  display: flex;
  list-style-type: none;
  margin: 0;
  padding: 0;
  flex-flow: wrap row;
  gap: 0.5rem;

  &:not(:last-child) {
    margin-bottom: 0.5rem;
  }
`;

const StyledNotificationActionItem = styled.li<{ $grow?: boolean }>`
  display: flex;
  flex-grow: ${(props) => (props.$grow ? 1 : 0)};
`;

const StyledNotificationRow = styled.div`
  &:not(:last-child) {
    margin-bottom: 0.5rem;
  }
`;

const StyledGuessDetails = styled.li`
  display: contents;
`;

const StyledGuessHeader = styled.strong`
  overflow-wrap: break-word;
  overflow: hidden;
  hyphens: auto;
  margin-right: auto;
`;

const StyledNotificationTimestamp = styled.small`
  text-align: end;
`;

const GuessMessage = React.memo(
  ({
    guess,
    puzzle,
    hunt,
    guesser,
    onDismiss,
  }: {
    guess: GuessType;
    puzzle: PuzzleType;
    hunt: HuntType;
    guesser: string;
    onDismiss: (guessId: string) => void;
  }) => {
    const [nextState, setNextState] = useState<GuessType["state"]>();
    const [additionalNotes, setAdditionalNotes] = useState("");
    const onAdditionalNotesChange: React.ChangeEventHandler<HTMLTextAreaElement> =
      useCallback((e) => {
        setAdditionalNotes(e.target.value);
      }, []);

    const markCorrect = useCallback(() => {
      setGuessState.call({ guessId: guess._id, state: "correct" });
    }, [guess._id]);

    const markIncorrect = useCallback(() => {
      setGuessState.call({ guessId: guess._id, state: "incorrect" });
    }, [guess._id]);

    const toggleStateIntermediate = useCallback(() => {
      setNextState((state) =>
        state === "intermediate" ? undefined : "intermediate",
      );
    }, []);

    const toggleStateRejected = useCallback(() => {
      setNextState((state) => (state === "rejected" ? undefined : "rejected"));
    }, []);

    const submitStageTwo = useCallback(() => {
      if (!nextState) return;

      setGuessState.call({
        guessId: guess._id,
        state: nextState,
        additionalNotes: additionalNotes === "" ? undefined : additionalNotes,
      });
    }, [guess._id, nextState, additionalNotes]);
    const onAdditionalNotesKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> =
      useCallback(
        (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            submitStageTwo();
          }
        },
        [submitStageTwo],
      );

    const dismissGuess = useCallback(() => {
      onDismiss(guess._id);
    }, [onDismiss, guess._id]);

    const extLinkTooltip = (
      <Tooltip id={`notification-guess-${guess._id}-ext-link-tooltip`}>
        Open puzzle
      </Tooltip>
    );

    const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;

    const disableForms = guess.state !== "pending";

    const correctButtonVariant =
      guess.state === "correct" ? "success" : "outline-secondary";
    const intermediateButtonVariant =
      guess.state === "intermediate" ? "warning" : "outline-secondary";
    const incorrectButtonVariant =
      guess.state === "incorrect" ? "danger" : "outline-secondary";
    const rejectButtonVariant =
      guess.state === "rejected" ? "secondary" : "outline-secondary";

    const stageTwoLabels = {
      intermediate:
        "Paste or write any additional instructions to pass on to the solver:",
      rejected:
        "Include any additional information on why this guess was rejected:",
    };

    let stageTwoSection;
    switch (nextState) {
      case "intermediate":
      case "rejected":
        stageTwoSection = (
          <Form>
            <StyledNotificationRow>
              <Form.Group controlId={`guess-${guess._id}-additional-notes`}>
                <Form.Label>{stageTwoLabels[nextState]}</Form.Label>
                <StyledNotificationRow>
                  <ReactTextareaAutosize
                    id={`guess-${guess._id}-additional-notes`}
                    minRows={1}
                    className="form-control"
                    autoFocus
                    disabled={disableForms}
                    value={additionalNotes}
                    onChange={onAdditionalNotesChange}
                    onKeyDown={onAdditionalNotesKeyDown}
                  />
                </StyledNotificationRow>
              </Form.Group>
            </StyledNotificationRow>
            <StyledNotificationActionBar>
              <StyledNotificationActionItem>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={disableForms}
                  onClick={submitStageTwo}
                >
                  Save (or press Enter)
                </Button>
              </StyledNotificationActionItem>
            </StyledNotificationActionBar>
          </Form>
        );
        break;
      default:
        stageTwoSection = undefined;
        break;
    }

    let directionLabel;
    let directionVariant;
    if (guess?.direction > 5) {
      directionLabel = "Forward";
      directionVariant = "primary";
    } else if (guess?.direction > 0) {
      directionLabel = "Forward*";
      directionVariant = "primary";
    } else if (guess?.direction < -5) {
      directionLabel = "Back";
      directionVariant = "danger";
    } else if (guess?.direction < 0) {
      directionLabel = "Back*";
      directionVariant = "danger";
    } else {
      directionLabel = "Mixed";
      directionVariant = "secondary";
    }
    let confidenceLabel;
    let confidenceVariant;

    if (guess?.confidence > 0) {
      confidenceLabel = "High";
      confidenceVariant = "success";
    } else if (guess?.confidence < -5) {
      confidenceLabel = "Low";
      confidenceVariant = "danger";
    } else {
      confidenceLabel = "Medium";
      confidenceVariant = "warning";
    }

    return (
      <Toast onClose={dismissGuess}>
        <Toast.Header>
          <StyledGuessHeader>
            <FontAwesomeIcon icon={faKey} style={{ marginRight: ".4em" }} />
            Guess for{" "}
            <a href={linkTarget} target="_blank" rel="noopener noreferrer">
              {puzzle.title}
            </a>{" "}
            {/* 
            from{" "}
            <a
              href={`/users/${guess.createdBy}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {guesser}
            </a>
             */}
          </StyledGuessHeader>
          <StyledNotificationTimestamp>
            {calendarTimeFormat(guess.createdAt)}
          </StyledNotificationTimestamp>
          {guess.state !== "pending" && (
            <SpinnerTimer
              className="ms-3"
              width={16}
              height={16}
              startTime={guess.updatedAt.getTime()}
              endTime={guess.updatedAt.getTime() + LINGER_PERIOD}
            />
          )}
        </Toast.Header>
        <Toast.Body>
          <StyledNotificationRow
            style={{
              maxHeight: "15rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <PuzzleAnswer answer={guess.guess} breakable />
          </StyledNotificationRow>
          <StyledNotificationActionBar>
            <StyledNotificationActionItem>
              <CopyToClipboardButton
                tooltipId={`notification-guess-${guess._id}-copy-tooltip`}
                text={guess.guess}
                variant="outline-secondary"
                size="sm"
                aria-label="Copy"
              >
                <FontAwesomeIcon icon={faCopy} />
              </CopyToClipboardButton>
            </StyledNotificationActionItem>
            <StyledNotificationActionItem>
              <OverlayTrigger placement="top" overlay={extLinkTooltip}>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  as="a"
                  href={guessURL(hunt, puzzle)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FontAwesomeIcon icon={faPuzzlePiece} />
                </Button>
              </OverlayTrigger>
            </StyledNotificationActionItem>
            <Button size="sm" variant={directionVariant}>
              {directionLabel}
            </Button>
            <Button size="sm" variant={confidenceVariant}>
              {confidenceLabel}
            </Button>
          </StyledNotificationActionBar>
          <StyledNotificationActionBar>
            <StyledNotificationActionItem $grow>
              <Button
                variant={correctButtonVariant}
                size="sm"
                className="flex-grow-1"
                disabled={disableForms}
                onClick={markCorrect}
              >
                Correct
              </Button>
            </StyledNotificationActionItem>
            <StyledNotificationActionItem $grow>
              <Button
                variant={intermediateButtonVariant}
                size="sm"
                className="flex-grow-1"
                disabled={disableForms}
                active={nextState === "intermediate"}
                onClick={toggleStateIntermediate}
              >
                Intermediate…
              </Button>
            </StyledNotificationActionItem>
            <StyledNotificationActionItem $grow>
              <Button
                variant={incorrectButtonVariant}
                size="sm"
                className="flex-grow-1"
                disabled={disableForms}
                onClick={markIncorrect}
              >
                Incorrect
              </Button>
            </StyledNotificationActionItem>
            <StyledNotificationActionItem $grow>
              <Button
                variant={rejectButtonVariant}
                size="sm"
                className="flex-grow-1"
                disabled={disableForms}
                active={nextState === "rejected"}
                onClick={toggleStateRejected}
              >
                Reject…
              </Button>
            </StyledNotificationActionItem>
          </StyledNotificationActionBar>
          {guess.state !== "pending" && guess.additionalNotes && (
            <>
              <div>Additional notes:</div>
              <Markdown text={guess.additionalNotes} />
            </>
          )}
          {guess.state === "pending" && stageTwoSection}
        </Toast.Body>
      </Toast>
    );
  },
);

const AnnouncementMessage = React.memo(
  ({
    id,
    announcement,
    createdByDisplayName,
  }: {
    id: string;
    announcement: AnnouncementType;
    createdByDisplayName: string;
  }) => {
    const [dismissed, setDismissed] = useState<boolean>(false);
    const onDismiss = useCallback(() => {
      setDismissed(true);
      dismissPendingAnnouncement.call({ pendingAnnouncementId: id });
    }, [id]);

    if (dismissed) {
      return null;
    }

    return (
      <AnnouncementToast
        message={announcement.message}
        createdAt={announcement.createdAt}
        displayName={createdByDisplayName}
        onClose={onDismiss}
        className="text-bg-warning"
      />
    );
  },
);

enum UpdateGoogleScriptStatus {
  IDLE = "idle",
  PENDING = "pending",
  ERROR = "error",
}

type UpdateGoogleScriptState =
  | {
      status: Exclude<UpdateGoogleScriptStatus, UpdateGoogleScriptStatus.ERROR>;
    }
  | {
      status: UpdateGoogleScriptStatus.ERROR;
      error: string;
    };

const UpdateGoogleScriptMessage = ({
  onDismiss,
}: {
  onDismiss: () => void;
}) => {
  const [state, setState] = useState<UpdateGoogleScriptState>({
    status: UpdateGoogleScriptStatus.IDLE,
  });

  const updateGoogleScript = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setState({ status: UpdateGoogleScriptStatus.PENDING });
      configureEnsureGoogleScript.call((error) => {
        if (error) {
          setState({
            status: UpdateGoogleScriptStatus.ERROR,
            error: error.message,
          });
        } else {
          setState({ status: UpdateGoogleScriptStatus.IDLE });
        }
      });
    },
    [],
  );

  return (
    <Toast onClose={onDismiss}>
      <Toast.Header>
        <strong className="me-auto">Update Google Script</strong>
      </Toast.Header>
      <Toast.Body>
        The currently deployed version of Jolly Roger&apos;s Google Apps Script
        is out of date. This can cause issues with features that depend on it,
        such as inserting images into spreadsheets.
        <StyledNotificationActionBar>
          <StyledNotificationActionItem>
            <Button
              variant="outline-secondary"
              disabled={state.status === UpdateGoogleScriptStatus.PENDING}
              onClick={updateGoogleScript}
            >
              Update
              {state.status === UpdateGoogleScriptStatus.PENDING && (
                <>
                  {" "}
                  <FontAwesomeIcon icon={faSpinner} spin />
                </>
              )}
            </Button>
          </StyledNotificationActionItem>
        </StyledNotificationActionBar>
        {state.status === UpdateGoogleScriptStatus.ERROR ? state.error : null}
      </Toast.Body>
    </Toast>
  );
};

const ProfileMissingMessage = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <Toast onClose={onDismiss}>
      <Toast.Header>
        <strong className="me-auto">Profile missing</strong>
      </Toast.Header>
      <Toast.Body>
        Somehow you don&apos;t seem to have a profile. (This can happen if you
        wind up having to do a password reset before you successfully log in for
        the first time.) Please set a display name for yourself via{" "}
        <Link to="/users/me">the profile page</Link>.
      </Toast.Body>
    </Toast>
  );
};

const PuzzleNotificationMessage = ({
  pn,
  hunt,
  puzzle,
  content,
  ephemeral,
}: {
  pn: PuzzleNotificationType;
  hunt: HuntType;
  puzzle: PuzzleType;
  content: string;
  ephemeral: boolean | undefined;
}) => {
  const id = pn._id;
  const dismiss = useCallback(
    () => dismissPuzzleNotification.call({ puzzleNotificationId: id }),
    [id],
  );

  return (
    <Toast onClose={dismiss} delay={5000} autohide={ephemeral}>
      <Toast.Header>
        <strong className="me-auto">
          <Link to={`/hunts/${hunt._id}/puzzles/${puzzle._id}`}>
            {puzzle.title}
          </Link>
        </strong>
        <StyledNotificationTimestamp>
          {calendarTimeFormat(pn.createdAt)}
        </StyledNotificationTimestamp>
      </Toast.Header>
      <Toast.Body>
        <div>{content}</div>
      </Toast.Body>
    </Toast>
  );
};

const ChatNotificationMessage = ({
  cn,
  hunt,
  puzzle,
  displayNames,
  selfUserId,
}: {
  cn: ChatNotificationType;
  hunt: HuntType;
  puzzle: PuzzleType;
  displayNames: Map<string, string>;
  selfUserId: string;
}) => {
  const id = cn._id;
  const dismiss = useCallback(
    () => dismissChatNotification.call({ chatNotificationId: id }),
    [id],
  );

  const senderDisplayName = displayNames.get(cn.sender) ?? "???";

  return (
    <Toast onClose={dismiss}>
      <Toast.Header>
        <strong className="me-auto">
          {senderDisplayName}
          {" on "}
          <Link to={`/hunts/${hunt._id}/puzzles/${puzzle._id}`}>
            {puzzle.title}
          </Link>
        </strong>
        <StyledNotificationTimestamp>
          {calendarTimeFormat(cn.createdAt)}
        </StyledNotificationTimestamp>
      </Toast.Header>
      <Toast.Body>
        <div>
          <ChatMessage
            message={cn.content}
            displayNames={displayNames}
            selfUserId={selfUserId}
          />
        </div>
      </Toast.Body>
    </Toast>
  );
};

const BookmarkNotificationMessage = ({
  bn,
  hunt,
  puzzle,
}: {
  bn: BookmarkNotificationType;
  hunt: HuntType;
  puzzle: PuzzleType;
}) => {
  const id = bn._id;
  const dismiss = useCallback(
    () => dismissBookmarkNotification.call({ bookmarkNotificationId: id }),
    [id],
  );

  let describeState;
  switch (bn.solvedness) {
    case "solved":
      describeState = "has been solved";
      break;
    case "unsolved":
      describeState = "has been partially solved";
      break;
    default:
      describeState = "has changed state";
      break;
  }

  return (
    <Toast onClose={dismiss}>
      <Toast.Header>
        <strong className="me-auto">
          <Link to={`/hunts/${hunt._id}/puzzles/${puzzle._id}`}>
            {puzzle.title}
          </Link>{" "}
          {describeState}
        </strong>
      </Toast.Header>
      <Toast.Body>
        <div>
          A puzzle you have bookmarked {describeState}. The{" "}
          {puzzle.answers.length > 1 && "new "}
          answer is: <PuzzleAnswer answer={bn.answer} breakable />
        </div>
      </Toast.Body>
    </Toast>
  );
};

const ReloadRequiredNotification = ({ reasons }: { reasons: string[] }) => {
  const reload = useCallback(() => window.location.reload(), []);

  return (
    <Toast>
      <Toast.Header closeButton={false}>
        <strong className="me-auto">Jolly Roger update pending</strong>
      </Toast.Header>
      <Toast.Body>
        <StyledNotificationRow>
          There is a new version of Jolly Roger available, but we&apos;re
          delaying the update because:
          <ul>
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          We don&apos;t want to interrupt your work, but it is important that
          you update as soon as is reasonable, so when you&apos;re at a breaking
          point, please reload the page. (Or if these blockers all go away, we
          will do so automatically.)
        </StyledNotificationRow>
        <StyledNotificationActionBar>
          <StyledNotificationActionItem>
            <Button variant="outline-danger" onClick={reload} size="sm">
              Reload
            </Button>
          </StyledNotificationActionItem>
        </StyledNotificationActionBar>
      </Toast.Body>
    </Toast>
  );
};

const StyledToastContainer = styled(ToastContainer)`
  z-index: 1050;

  > *:not(:last-child) {
    /* I like these toasts packed a little more efficiently */
    margin-bottom: 0.5rem;
  }
`;

const NotificationCenter = () => {
  const showGoogleScriptInfo = useTracker(() => {
    return (
      isAdmin(Meteor.user()) &&
      !Flags.active("disable.google") &&
      ServiceConfiguration.configurations.findOne({ service: "google" })
    );
  }, []);
  useSubscribe(showGoogleScriptInfo ? "googleScriptInfo" : undefined);
  const showUpdateGoogleScript = useTracker(() => {
    return showGoogleScriptInfo ? GoogleScriptInfo.findOne()?.outOfDate : false;
  }, [showGoogleScriptInfo]);

  const [pendingUpdate, blockReasons] = useBlockReasons();

  const operatorHunts = useTracker(
    () => [...huntsUserIsOperatorFor(Meteor.user())],
    [],
  );
  const fetchPendingGuesses = operatorHunts.length > 0;
  const pendingGuessesLoading = useTypedSubscribe(
    fetchPendingGuesses ? pendingGuessesForSelf : undefined,
  );

  const [operatorActionsHidden = {}] = useOperatorActionsHidden();

  const pendingAnnouncementsLoading = useTypedSubscribe(
    pendingAnnouncementsForSelf,
  );
  const bookmarkNotificationsLoading = useTypedSubscribe(
    bookmarkNotificationsForSelf,
  );
  const puzzleNotificationsLoading = useTypedSubscribe(
    puzzleNotificationsForSelf,
  );

  const disableDingwords = useTracker(() => Flags.active("disable.dingwords"));
  const chatNotificationsLoading = useSubscribe(
    disableDingwords ? undefined : "chatNotifications",
  );

  const loading =
    pendingGuessesLoading() ||
    pendingAnnouncementsLoading() ||
    bookmarkNotificationsLoading() ||
    chatNotificationsLoading() ||
    puzzleNotificationsLoading();

  const { hasOwnProfile, discordConfiguredByUser } = useTracker(() => {
    const user = Meteor.user()!;
    return {
      hasOwnProfile: !!user.displayName,
      discordConfiguredByUser: !!user.discordAccount,
    };
  }, []);

  const selfUserId = useTracker(() => Meteor.userId()!, []);
  // Lookup tables to support guesses/pendingAnnouncements/chatNotifications/bookmarkNotifications
  const hunts = useTracker(
    () =>
      loading ? new Map<string, HuntType>() : indexedById(Hunts.find().fetch()),
    [loading],
  );
  const puzzles = useTracker(
    () =>
      loading
        ? new Map<string, PuzzleType>()
        : indexedById(Puzzles.find().fetch()),
    [loading],
  );
  const displayNames = useTracker(
    () => (loading ? new Map<string, string>() : indexedDisplayNames()),
    [loading],
  );
  const announcements = useTracker(
    () =>
      loading
        ? new Map<string, AnnouncementType>()
        : indexedById(Announcements.find().fetch()),
    [loading],
  );

  const [recentGuessEpoch, setRecentGuessEpoch] = useState<number>(
    Date.now() - LINGER_PERIOD,
  );
  const guesses = useTracker(
    () =>
      loading || !fetchPendingGuesses
        ? []
        : Guesses.find(
            {
              $and: [
                {
                  // Only display pending guesses for hunts in which we are an operator.
                  // It's possible that e.g. on a puzzle page, we'll be subscribed to
                  // all guesses for that puzzle, so we should avoid showing guess
                  // queue UI if we're an operator for a different hunt but not the
                  // one the guess is for.
                  hunt: { $in: operatorHunts },
                },
                {
                  $or: [
                    { state: "pending" },
                    { updatedAt: { $gt: new Date(recentGuessEpoch) } },
                  ],
                },
              ],
            },
            { sort: { createdAt: 1 } },
          )
            .fetch()
            .filter((g) => puzzles.has(g.puzzle)),
    [loading, fetchPendingGuesses, operatorHunts, recentGuessEpoch, puzzles],
  );
  const pendingAnnouncements = useTracker(
    () =>
      loading
        ? []
        : PendingAnnouncements.find(
            { user: Meteor.userId()! },
            { sort: { createdAt: 1 } },
          ).fetch(),
    [loading],
  );
  const puzzleNotifications = useTracker(
    () =>
      loading || disableDingwords
        ? []
        : PuzzleNotifications.find({}, { sort: { timestamp: 1 } }).fetch(),
    [loading, disableDingwords],
  );
  const chatNotifications = useTracker(
    () =>
      loading || disableDingwords
        ? []
        : ChatNotifications.find({}, { sort: { timestamp: 1 } }).fetch(),
    [loading, disableDingwords],
  );
  const bookmarkNotifications = useTracker(() =>
    loading
      ? []
      : BookmarkNotifications.find({}, { sort: { createdAt: 1 } }).fetch(),
  );

  const [hideUpdateGoogleScriptMessage, setHideUpdateGoogleScriptMessage] =
    useState<boolean>(false);
  const [hideProfileSetupMessage, setHideProfileSetupMessage] =
    useState<boolean>(false);
  const [dismissedGuesses, setDismissedGuesses] = useState<
    Record<string, Date>
  >({});

  const onHideUpdateGoogleScriptMessage = useCallback(() => {
    setHideUpdateGoogleScriptMessage(true);
  }, []);

  const onHideProfileSetupMessage = useCallback(() => {
    setHideProfileSetupMessage(true);
  }, []);

  const dismissGuess = useCallback((guessId: string) => {
    setDismissedGuesses((prevDismissedGuesses) => {
      const newState: Record<string, Date> = {};
      newState[guessId] = new Date();
      Object.assign(newState, prevDismissedGuesses);
      return newState;
    });
  }, []);

  useEffect(() => {
    // Update after some seconds if one of the guesses was lingering
    // after a state change.
    const lingeringGuesses = guesses.filter((g) => g.state !== "pending");
    if (lingeringGuesses.length === 0) {
      return () => {
        /* no unwind */
      };
    }

    const earliestLingerUpdatedAt = Math.min(
      ...lingeringGuesses.map((g) => g.updatedAt?.getTime() ?? 0),
    );
    // We want to schedule an update to recentGuessEpoch to run once the oldest
    // lingering guess would fall out of retention.
    const earliestLingerDisappearsAt = earliestLingerUpdatedAt + LINGER_PERIOD;
    const timeUntilLingerDisappears = earliestLingerDisappearsAt - Date.now();

    const timeout = Meteor.setTimeout(() => {
      setRecentGuessEpoch(Date.now() - LINGER_PERIOD);
    }, timeUntilLingerDisappears);

    return () => {
      if (timeout) {
        Meteor.clearTimeout(timeout);
      }
    };
  }, [guesses]);

  if (loading) {
    return <div />;
  }

  // Build a list of uninstantiated messages with their props, then create them
  const messages = [] as React.JSX.Element[];

  if (pendingUpdate && blockReasons.length > 0) {
    messages.push(<ReloadRequiredNotification reasons={blockReasons} />);
  }

  if (showUpdateGoogleScript && !hideUpdateGoogleScriptMessage) {
    messages.push(
      <UpdateGoogleScriptMessage
        onDismiss={onHideUpdateGoogleScriptMessage}
        key="updateGoogleScript"
      />,
    );
  }

  if (!hasOwnProfile && !hideProfileSetupMessage) {
    messages.push(
      <ProfileMissingMessage
        key="profile"
        onDismiss={onHideProfileSetupMessage}
      />,
    );
  }

  guesses.forEach((g) => {
    const dismissedAt = dismissedGuesses[g._id];
    if (dismissedAt && dismissedAt > (g.updatedAt ?? g.createdAt)) return;
    if (operatorActionsHidden[g.hunt]) return;
    const hunt = hunts.get(g.hunt);
    const puzzle = puzzles.get(g.puzzle);
    if (!hunt || !puzzle) return;
    if (!hunt.hasGuessQueue) return;
    messages.push(
      <GuessMessage
        key={g._id}
        guess={g}
        puzzle={puzzle}
        hunt={hunt}
        guesser={displayNames.get(g.createdBy) ?? "???"}
        onDismiss={dismissGuess}
      />,
    );
  });

  pendingAnnouncements.forEach((pa) => {
    const announcement = announcements.get(pa.announcement);
    if (!announcement) return;
    messages.push(
      <AnnouncementMessage
        key={pa._id}
        id={pa._id}
        announcement={announcement}
        createdByDisplayName={displayNames.get(pa.createdBy) ?? "???"}
      />,
    );
  });

  chatNotifications.forEach((cn) => {
    const hunt = hunts.get(cn.hunt);
    const puzzle = puzzles.get(cn.puzzle);
    if (!hunt || !puzzle) return;
    messages.push(
      <ChatNotificationMessage
        key={cn._id}
        cn={cn}
        hunt={hunt}
        puzzle={puzzle}
        displayNames={displayNames}
        selfUserId={selfUserId}
      />,
    );
  });

  bookmarkNotifications.forEach((bn) => {
    const hunt = hunts.get(bn.hunt);
    const puzzle = puzzles.get(bn.puzzle);
    if (!hunt || !puzzle) return;
    messages.push(
      <BookmarkNotificationMessage
        key={bn._id}
        bn={bn}
        hunt={hunt}
        puzzle={puzzle}
      />,
    );
  });

  puzzleNotifications.forEach((pn) => {
    const hunt = hunts.get(pn.hunt);
    const puzzle = puzzles.get(pn.puzzle);
    if (!hunt || !puzzle) return;
    messages.push(
      <PuzzleNotificationMessage
        key={pn._id}
        pn={pn}
        hunt={hunt}
        puzzle={puzzle}
        content={pn.content}
        ephemeral={pn.ephemeral ?? false}
      />,
    );
  });

  return (
    <StyledToastContainer position="bottom-end" className="p-3 position-fixed">
      {messages.reverse()}
    </StyledToastContainer>
  );
};

export default NotificationCenter;
