import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";
import { faComment } from "@fortawesome/free-solid-svg-icons/faComment";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faKey } from "@fortawesome/free-solid-svg-icons/faKey";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";
import Tooltip from "react-bootstrap/Tooltip";
import { Link } from "react-router-dom";
import ReactTextareaAutosize from "react-textarea-autosize";
import styled, { useTheme } from "styled-components";
import Flags from "../../Flags";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import isAdmin from "../../lib/isAdmin";
import { indexedById } from "../../lib/listUtils";
import type { AnnouncementType } from "../../lib/models/Announcements";
import Announcements from "../../lib/models/Announcements";
import type { BookmarkNotificationType } from "../../lib/models/BookmarkNotifications";
import BookmarkNotifications from "../../lib/models/BookmarkNotifications";
import type { ChatNotificationType } from "../../lib/models/ChatNotifications";
import ChatNotifications from "../../lib/models/ChatNotifications";
import type { GuessType } from "../../lib/models/Guesses";
import Guesses from "../../lib/models/Guesses";
import type { HuntType } from "../../lib/models/Hunts";
import Hunts from "../../lib/models/Hunts";
import PendingAnnouncements from "../../lib/models/PendingAnnouncements";
import type { PuzzleNotificationType } from "../../lib/models/PuzzleNotifications";
import PuzzleNotifications from "../../lib/models/PuzzleNotifications";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import {
  huntsUserIsOperatorFor,
  listAllRolesForHunt,
} from "../../lib/permission_stubs";
import bookmarkNotificationsForSelf from "../../lib/publications/bookmarkNotificationsForSelf";
import pendingAnnouncementsForSelf from "../../lib/publications/pendingAnnouncementsForSelf";
import pendingGuessesForSelf from "../../lib/publications/pendingGuessesForSelf";
import puzzleNotificationsForSelf from "../../lib/publications/puzzleNotificationsForSelf";
import puzzlesForHunt from "../../lib/publications/puzzlesForHunt";
import bookmarkPuzzle from "../../methods/bookmarkPuzzle";
import configureEnsureGoogleScript from "../../methods/configureEnsureGoogleScript";
import dismissAllDingsForPuzzle from "../../methods/dismissAllDingsForPuzzle";
import dismissBookmarkNotification from "../../methods/dismissBookmarkNotification";
import dismissChatNotification from "../../methods/dismissChatNotification";
import dismissPendingAnnouncement from "../../methods/dismissPendingAnnouncement";
import dismissPuzzleNotification from "../../methods/dismissPuzzleNotification";
import setGuessState from "../../methods/setGuessState";
import suppressDingwordsForPuzzle from "../../methods/suppressDingwordsForPuzzle";
import { guessURL } from "../../model-helpers";
import GoogleScriptInfo from "../GoogleScriptInfo";
import {
  useOperatorActionsHidden,
  useOperatorActionsHiddenForHunt,
} from "../hooks/persisted-state";
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
    const [confirmNonTrivialEdit, setConfirmNonTrivialEdit] =
      useState<boolean>(false);
    const [nonTrivialEdit, setNonTrivialEdit] = useState<string | undefined>(
      undefined,
    );
    const [additionalNotes, setAdditionalNotes] = useState("");
    const onAdditionalNotesChange: React.ChangeEventHandler<HTMLTextAreaElement> =
      useCallback((e) => {
        setAdditionalNotes(e.target.value);
      }, []);

    const markCorrect = useCallback(() => {
      if (nextState === "correct") {
        setNextState(undefined);
        return;
      }
      setGuessState.call({ guessId: guess._id, state: "correct" });
    }, [guess._id, nextState]);

    const markIncorrect = useCallback(() => {
      setGuessState.call({ guessId: guess._id, state: "incorrect" });
    }, [guess._id]);

    const resetNonTrivialEdit = useCallback(() => {
      setConfirmNonTrivialEdit(false);
      setNonTrivialEdit(undefined);
    }, []);

    const toggleStateIntermediate = useCallback(() => {
      resetNonTrivialEdit();
      setNextState((state) =>
        state === "intermediate" ? undefined : "intermediate",
      );
    }, [resetNonTrivialEdit]);

    const toggleStateRejected = useCallback(() => {
      resetNonTrivialEdit();
      setNextState((state) => (state === "rejected" ? undefined : "rejected"));
    }, [resetNonTrivialEdit]);

    const toggleStateCorrectWithEdit = useCallback(() => {
      resetNonTrivialEdit();
      setNextState((state) => (state === "correct" ? undefined : "correct"));
    }, [resetNonTrivialEdit]);

    const submitStageTwo = useCallback(() => {
      if (!nextState) return;

      if (nextState === "correct") {
        if (additionalNotes === "" || additionalNotes === guess.guess) {
          setGuessState.call({
            guessId: guess._id,
            state: "correct",
          });
          return;
        } else {
          if (
            (!confirmNonTrivialEdit || nonTrivialEdit !== additionalNotes) &&
            additionalNotes.replace(/\s/g, "").toLowerCase() !==
              guess.guess.replace(/\s/g, "").toLowerCase()
          ) {
            setConfirmNonTrivialEdit(true);
            setNonTrivialEdit(additionalNotes);
            setAdditionalNotes("");
            return;
          }
          setGuessState.call({
            guessId: guess._id,
            state: "correct",
            correctAnswer: additionalNotes,
          });
          return;
        }
      }

      setGuessState.call({
        guessId: guess._id,
        state: nextState,
        additionalNotes: additionalNotes === "" ? undefined : additionalNotes,
      });
    }, [
      guess._id,
      nextState,
      additionalNotes,
      guess.guess,
      confirmNonTrivialEdit,
      nonTrivialEdit,
    ]);
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

    const idPrefix = useId();

    const extLinkTooltip = (
      <Tooltip id={`${idPrefix}-ext-link-tooltip`}>Open puzzle</Tooltip>
    );

    const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;

    const disableForms = guess.state !== "pending";

    const correctButtonVariant =
      guess.state === "correct" || nextState === "correct"
        ? "success"
        : "outline-success";
    const intermediateButtonVariant =
      guess.state === "intermediate" ? "primary" : "outline-primary";
    const incorrectButtonVariant =
      guess.state === "incorrect" ? "danger" : "outline-danger";
    const rejectButtonVariant =
      guess.state === "rejected" ? "secondary" : "outline-secondary";

    const stageTwoLabels = {
      intermediate:
        "Paste or write any additional instructions to pass on to the solver:",
      rejected:
        "Include any additional information on why this guess was rejected:",
      correct: (
        <>
          <p>
            Enter the corrected answer to this puzzle as provided by game
            control (or just submit to mark it correct).
          </p>
          {confirmNonTrivialEdit && nextState === "correct" && (
            <Alert variant="warning" transition={false}>
              <strong>⚠️ Are you sure?</strong>
              You are changing more than just the spacing of this answer. Please
              check it and submit it again to confirm.
              <br />
            </Alert>
          )}
          <Form.Group>
            <Form.Label>Original answer:</Form.Label>
            <ReactTextareaAutosize
              id={`${idPrefix}-additional-notes`}
              minRows={1}
              className="form-control"
              disabled
            >
              {guess.guess}
            </ReactTextareaAutosize>
          </Form.Group>
          <br />
          <Form.Label>Your correction:</Form.Label>
        </>
      ),
    };

    let stageTwoSection;
    const submittedStageTwoLabels = {
      intermediate: "Additional instructions passed on to the solver:",
      rejected: "Additional information on why this guess was rejected:",
      correct: "Corrected answer submitted:",
    };
    switch (nextState) {
      case "correct":
      case "intermediate":
      case "rejected":
        stageTwoSection = (
          <Form>
            <StyledNotificationRow>
              <Form.Group controlId={`${idPrefix}-additional-notes`}>
                <Form.Label>{stageTwoLabels[nextState]}</Form.Label>
                <StyledNotificationRow>
                  <ReactTextareaAutosize
                    id={`${idPrefix}-additional-notes`}
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
                  variant="secondary"
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

    if (guess?.confidence > 50) {
      confidenceLabel = "High";
      confidenceVariant = "success";
    } else if (guess?.confidence < 50) {
      confidenceLabel = "Low";
      confidenceVariant = "danger";
    } else {
      confidenceLabel = "Medium";
      confidenceVariant = "warning";
    }

    const [showSettings, setShowSettings] = useState(false);
    const toggleSettings = () => {
      setShowSettings(!showSettings);
    };

    const [_operatorActionsHidden, setOperatorActionsHidden] =
      useOperatorActionsHiddenForHunt(guess.hunt);

    const hideOperatorActionsForHunt = function () {
      setOperatorActionsHidden(true);
    };

    const theme = useTheme();

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
          <Dropdown className="ms-auto" onToggle={toggleSettings}>
            <Dropdown.Toggle
              variant={theme.basicMode}
              size="sm"
              as={Button}
              id={`guess-settings-${guess._id}`}
            >
              <FontAwesomeIcon icon={faCog} />
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item
                onClick={() => {
                  hideOperatorActionsForHunt();
                }}
              >
                Disable guess notifications for this hunt
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
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
              <Dropdown as={ButtonGroup}>
                <Button
                  variant={correctButtonVariant}
                  className="flex-grow-1"
                  disabled={disableForms}
                  onClick={markCorrect}
                  size="sm"
                >
                  Correct
                </Button>
                <Dropdown.Toggle split variant={correctButtonVariant} />
                <Dropdown.Menu align="end">
                  <Dropdown.Item
                    onClick={toggleStateCorrectWithEdit}
                    variant="success"
                    size="sm"
                  >
                    Correct with edit...
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
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
              <div>{submittedStageTwoLabels[guess.state]}</div>
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

    const theme = useTheme();

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
        theme={theme}
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
  className,
}: {
  pn: PuzzleNotificationType;
  hunt: HuntType;
  puzzle: PuzzleType;
  content: string;
  ephemeral: boolean | undefined;
  className?: string;
}) => {
  const id = pn._id;
  const dismiss = useCallback(
    () => dismissPuzzleNotification.call({ puzzleNotificationId: id }),
    [id],
  );

  const ephemeralLingerPeriod = 5000;
  const startTime = Date.now();
  const endTime = startTime + 5000;

  return (
    <Toast
      onClose={dismiss}
      className={className}
      delay={ephemeralLingerPeriod}
      autohide={ephemeral}
    >
      <Toast.Header>
        <FontAwesomeIcon icon={faPuzzlePiece} style={{ marginRight: ".4em" }} />
        <strong className="me-auto">
          <Link to={`/hunts/${hunt._id}/puzzles/${puzzle._id}`}>
            {puzzle.title}
          </Link>
        </strong>
        <StyledNotificationTimestamp>
          {calendarTimeFormat(pn.createdAt)}
        </StyledNotificationTimestamp>
        {ephemeral && (
          <SpinnerTimer
            className="ms-3"
            width={16}
            height={16}
            startTime={startTime}
            endTime={endTime}
          />
        )}
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
  messageId,
  roles,
}: {
  cn: ChatNotificationType;
  hunt: HuntType;
  puzzle: PuzzleType;
  displayNames: Map<string, string>;
  selfUserId: string;
  messageId: string;
  roles: string[];
}) => {
  const id = cn._id;

  const [locallyMutedWords, setLocallyMutedWords] = useState<string[]>([]);
  const [suppressedAllForThis] = useState<boolean>(false);

  const suppressedFromProfile = useTracker(() => {
    const user = Meteor.user();
    return user?.suppressedDingwords?.[cn.hunt]?.[cn.puzzle] || [];
  }, [cn.hunt, cn.puzzle]);

  const { displayedDingwords, suppressAll } = useMemo(() => {
    const raw =
      cn.dingwords?.filter((word) => {
        const isLocallyMuted = locallyMutedWords.includes(word);
        const isProfileMuted = suppressedFromProfile.includes(word);
        const isAllMuted = suppressedFromProfile.includes("__ALL__");

        return !isLocallyMuted && !isProfileMuted && !isAllMuted;
      }) ?? [];
    const suppressAll =
      suppressedFromProfile.includes("__ALL__") || suppressedAllForThis;

    return { displayedDingwords: raw.slice(0, 3), suppressAll };
  }, [
    cn.dingwords,
    locallyMutedWords,
    suppressedFromProfile,
    suppressedAllForThis,
  ]);

  const handleDismissAll = useCallback(() => {
    const dismissUntil = new Date();
    dismissAllDingsForPuzzle.call({
      puzzle: cn.puzzle,
      hunt: cn.hunt,
      dismissUntil,
    });
  }, [cn.hunt, cn.puzzle]);

  const handleSuppressDingwords = useCallback(
    (dingword: string) => {
      const dismissUntil = new Date();
      suppressDingwordsForPuzzle.call({
        puzzle: cn.puzzle,
        hunt: cn.hunt,
        dingword,
        dismissUntil,
      });
      setLocallyMutedWords((prev) => [...prev, dingword]);
    },
    [cn.hunt, cn.puzzle],
  );

  const dismiss = useCallback(
    () => dismissChatNotification.call({ chatNotificationId: id }),
    [id],
  );

  const puzzleSubscribe = useTypedSubscribe(puzzlesForHunt, {
    huntId: hunt._id,
  });
  const puzzleLoading = puzzleSubscribe();

  const puzzleData = useTracker(() => {
    return puzzleLoading
      ? new Map<string, PuzzleType>()
      : Puzzles.find({ hunt: hunt._id })
          .fetch()
          .reduce((mp, p) => {
            return mp.set(p._id, p);
          }, new Map<string, PuzzleType>());
  }, [hunt._id, puzzleLoading]);

  const _senderDisplayName = displayNames.get(cn.sender) ?? "???";
  const [showSettings, setShowSettings] = useState(false);
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const theme = useTheme();

  const individualDingwordsMute = useMemo(() => {
    return displayedDingwords.map((word) => (
      <Dropdown.Item
        key={`${cn._id}-mute-${word}`}
        onClick={() => handleSuppressDingwords(word)}
      >
        Mute &quot;{word}&quot; for this puzzle
      </Dropdown.Item>
    ));
  }, [displayedDingwords, cn._id, handleSuppressDingwords]);

  return (
    <Toast onClose={dismiss}>
      <Toast.Header>
        <FontAwesomeIcon icon={faComment} style={{ marginRight: ".4em" }} />
        <strong className="me-auto">
          {/* {senderDisplayName} */}
          {/* {" on "} */}
          <Link
            to={`/hunts/${hunt._id}/puzzles/${puzzle._id}#msg=${messageId}`}
          >
            {puzzle.title}
          </Link>
        </strong>
        <StyledNotificationTimestamp>
          {calendarTimeFormat(cn.createdAt)}
        </StyledNotificationTimestamp>
        <Dropdown className="ms-auto" onToggle={toggleSettings}>
          <Dropdown.Toggle
            variant={theme.basicMode}
            size="sm"
            as={Button}
            id={`chat-settings-${cn._id}`}
          >
            <FontAwesomeIcon icon={faCog} />
          </Dropdown.Toggle>
          <Dropdown.Menu align="end">
            <Dropdown.Item onClick={handleDismissAll}>
              Dismiss all for this puzzle
            </Dropdown.Item>
            <Dropdown.Item as={Link} to="/users/me">
              Edit dingwords
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={() => handleSuppressDingwords("__ALL__")}>
              Mute <strong>all</strong> dingwords for this puzzle
            </Dropdown.Item>
            {!suppressedAllForThis ? individualDingwordsMute : null}
          </Dropdown.Menu>
        </Dropdown>
      </Toast.Header>
      <Toast.Body>
        <div>
          <ChatMessage
            message={cn.content}
            displayNames={displayNames}
            selfUserId={selfUserId}
            puzzleData={puzzleData}
            roles={roles}
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

  const [showSettings, setShowSettings] = useState(false);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const puzzleId = puzzle._id;

  const disableBookmark = async function () {
    await bookmarkPuzzle.callPromise({ puzzleId, bookmark: false });
  };

  const theme = useTheme();

  return (
    <Toast onClose={dismiss}>
      <Toast.Header>
        <strong className="me-auto">
          <Link
            to={`/hunts/${hunt._id}/puzzles/${puzzle._id}`}
            onClick={dismiss}
          >
            {puzzle.title}
          </Link>{" "}
          {describeState}
        </strong>
        <Dropdown className="ms-auto" onToggle={toggleSettings}>
          <Dropdown.Toggle
            variant={theme.basicMode}
            size="sm"
            as={Button}
            id={`bookmark-settings-${puzzleId}`}
          >
            <FontAwesomeIcon icon={faCog} />
          </Dropdown.Toggle>
          <Dropdown.Menu align="end">
            <Dropdown.Item
              onClick={() => {
                disableBookmark();
              }}
            >
              Unbookmark this puzzle
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
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
  const activeOperatorHunts = operatorHunts.filter(
    (huntId) => !operatorActionsHidden[huntId],
  );
  useSubscribe(
    activeOperatorHunts.length > 0 ? "subscribers.inc" : undefined,
    "operators",
    Object.fromEntries(activeOperatorHunts.map((h) => [h, true])),
  );

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

  const { hasOwnProfile, _discordConfiguredByUser } = useTracker(() => {
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
  const rolesForChat = useTracker(() => {
    const hunts = new Set(chatNotifications.map((cn) => cn.hunt));
    const roles = new Map(
      [...hunts].map((huntId) => {
        return [huntId, listAllRolesForHunt(Meteor.user(), { _id: huntId })];
      }),
    );
    return roles;
  }, [chatNotifications]);

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
        messageId={cn.message}
        puzzle={puzzle}
        displayNames={displayNames}
        selfUserId={selfUserId}
        roles={rolesForChat.get(cn.hunt) ?? []}
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
        className={pn.className}
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
