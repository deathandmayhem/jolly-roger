/* eslint-disable max-len */
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import Tooltip from 'react-bootstrap/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import ReactTextareaAutosize from 'react-textarea-autosize';
import styled from 'styled-components';
import Flags from '../../Flags';
import { calendarTimeFormat } from '../../lib/calendarTimeFormat';
import isAdmin from '../../lib/isAdmin';
import { indexedById } from '../../lib/listUtils';
import Announcements from '../../lib/models/Announcements';
import ChatNotifications from '../../lib/models/ChatNotifications';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import { indexedDisplayNames } from '../../lib/models/MeteorUsers';
import PendingAnnouncements from '../../lib/models/PendingAnnouncements';
import Puzzles from '../../lib/models/Puzzles';
import { userIsOperatorForAnyHunt } from '../../lib/permission_stubs';
import { AnnouncementType } from '../../lib/schemas/Announcement';
import { ChatNotificationType } from '../../lib/schemas/ChatNotification';
import { GuessType } from '../../lib/schemas/Guess';
import { HuntType } from '../../lib/schemas/Hunt';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import configureEnsureGoogleScript from '../../methods/configureEnsureGoogleScript';
import dismissChatNotification from '../../methods/dismissChatNotification';
import dismissPendingAnnouncement from '../../methods/dismissPendingAnnouncement';
import linkUserDiscordAccount from '../../methods/linkUserDiscordAccount';
import setGuessState from '../../methods/setGuessState';
import { guessURL } from '../../model-helpers';
import GoogleScriptInfo from '../GoogleScriptInfo';
import { requestDiscordCredential } from '../discord';
import { useOperatorActionsHidden } from '../hooks/persisted-state';
import markdown from '../markdown';
import PuzzleAnswer from './PuzzleAnswer';
import SpinnerTimer from './SpinnerTimer';
import { GuessConfidence, GuessDirection } from './guessDetails';
import Breakable from './styling/Breakable';

// How long to keep showing guess notifications after actioning.
// Note that this cannot usefully exceed the linger period implemented by the
// subscription that fetches the data from imports/server/guesses.ts
const LINGER_PERIOD = 4000;

const StyledNotificationActionBar = styled.ul`
  display: flex;
  list-style-type: none;
  margin: 0;

  &:not(:last-child) {
    margin-bottom: 0.5rem;
  }

  padding: 0;
  flex-flow: wrap row;
`;

const StyledNotificationActionItem = styled.li`
  margin-right: 0.5rem;
  display: inline-block;
`;

const StyledNotificationRow = styled.div`
  margin: 0;

  &:not(:last-child) {
    margin-bottom: 0.5rem;
  }

  padding: 0;
`;

const StyledGuessDetails = styled.div`
  display: flex;
  flex-grow: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  text-align: end;
`;

const StyledNotificationTimestamp = styled.small`
  text-align: end;
`;

const GuessMessage = React.memo(({
  guess, puzzle, hunt, guesser, onDismiss,
}: {
  guess: GuessType;
  puzzle: PuzzleType;
  hunt: HuntType;
  guesser: string;
  onDismiss: (guessId: string) => void;
}) => {
  const [nextState, setNextState] = useState<GuessType['state']>();
  const [additionalNotes, setAdditionalNotes] = useState('');
  const onAdditionalNotesChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    setAdditionalNotes(e.target.value);
  }, []);

  const markCorrect = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'correct' });
  }, [guess._id]);

  const markIncorrect = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'incorrect' });
  }, [guess._id]);

  const toggleStateIntermediate = useCallback(() => {
    setNextState((state) => (state === 'intermediate' ? undefined : 'intermediate'));
  }, []);

  const toggleStateRejected = useCallback(() => {
    setNextState((state) => (state === 'rejected' ? undefined : 'rejected'));
  }, []);

  const submitStageTwo = useCallback(() => {
    if (!nextState) return;

    setGuessState.call({
      guessId: guess._id,
      state: nextState,
      additionalNotes: additionalNotes === '' ? undefined : additionalNotes,
    });
  }, [guess._id, nextState, additionalNotes]);
  const onAdditionalNotesKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      submitStageTwo();
    }
  }, [submitStageTwo]);

  const dismissGuess = useCallback(() => {
    onDismiss(guess._id);
  }, [onDismiss, guess._id]);

  const copyTooltip = (
    <Tooltip id={`notification-guess-${guess._id}-copy-tooltip`}>
      Copy to clipboard
    </Tooltip>
  );
  const extLinkTooltip = (
    <Tooltip id={`notification-guess-${guess._id}-ext-link-tooltip`}>
      Open puzzle
    </Tooltip>
  );

  const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;

  const disableForms = guess.state !== 'pending';

  const correctButtonVariant = guess.state === 'correct' ? 'success' : 'outline-secondary';
  const intermediateButtonVariant = guess.state === 'intermediate' ? 'warning' : 'outline-secondary';
  const incorrectButtonVariant = guess.state === 'incorrect' ? 'danger' : 'outline-secondary';
  const rejectButtonVariant = guess.state === 'rejected' ? 'secondary' : 'outline-secondary';

  const stageTwoLabels = {
    intermediate: 'Paste or write any additional instructions to pass on to the solver:',
    rejected: 'Include any additional information on why this guess was rejected:',
  };

  let stageTwoSection;
  switch (nextState) {
    case 'intermediate':
    case 'rejected':
      stageTwoSection = (
        <Form>
          <StyledNotificationRow>
            <Form.Group controlId={`guess-${guess._id}-additional-notes`}>
              <Form.Label>
                {stageTwoLabels[nextState]}
              </Form.Label>
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
              <Button variant="outline-secondary" size="sm" disabled={disableForms} onClick={submitStageTwo}>Save (or press Enter)</Button>
            </StyledNotificationActionItem>
          </StyledNotificationActionBar>
        </Form>
      );
      break;
    default:
      stageTwoSection = undefined;
      break;
  }

  return (
    <Toast onClose={dismissGuess}>
      <Toast.Header>
        <strong className="me-auto">
          Guess for
          {' '}
          <a href={linkTarget} target="_blank" rel="noopener noreferrer">
            {puzzle.title}
          </a>
          {' '}
          from
          {' '}
          <a href={`/users/${guess.createdBy}`} target="_blank" rel="noopener noreferrer">
            <Breakable>{guesser}</Breakable>
          </a>
        </strong>
        <StyledNotificationTimestamp>
          {calendarTimeFormat(guess.createdAt)}
        </StyledNotificationTimestamp>
        {guess.state !== 'pending' && (
          <SpinnerTimer
            className="ms-3"
            width={16}
            height={16}
            startTime={guess.updatedAt!.getTime()}
            endTime={guess.updatedAt!.getTime() + LINGER_PERIOD}
          />
        )}
      </Toast.Header>
      <Toast.Body>
        <StyledNotificationRow>
          <PuzzleAnswer answer={guess.guess} />
        </StyledNotificationRow>
        <StyledNotificationActionBar>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={copyTooltip}>
              {({ ref, ...triggerHandler }) => (
                <CopyToClipboard text={guess.guess} {...triggerHandler}>
                  <Button variant="outline-secondary" size="sm" ref={ref} aria-label="Copy"><FontAwesomeIcon icon={faCopy} /></Button>
                </CopyToClipboard>
              )}
            </OverlayTrigger>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={extLinkTooltip}>
              <Button variant="outline-secondary" size="sm" as="a" href={guessURL(hunt, puzzle)} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faPuzzlePiece} />
              </Button>
            </OverlayTrigger>
          </StyledNotificationActionItem>
          <StyledGuessDetails>
            <GuessDirection value={guess.direction} />
            <GuessConfidence id={`notification-guess-${guess._id}-confidence`} value={guess.confidence} />
          </StyledGuessDetails>
        </StyledNotificationActionBar>
        <StyledNotificationActionBar>
          <StyledNotificationActionItem>
            <Button variant={correctButtonVariant} size="sm" disabled={disableForms} onClick={markCorrect}>Correct</Button>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <Button variant={intermediateButtonVariant} size="sm" disabled={disableForms} active={nextState === 'intermediate'} onClick={toggleStateIntermediate}>Intermediate…</Button>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <Button variant={incorrectButtonVariant} size="sm" disabled={disableForms} onClick={markIncorrect}>Incorrect</Button>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <Button variant={rejectButtonVariant} size="sm" disabled={disableForms} active={nextState === 'rejected'} onClick={toggleStateRejected}>Reject…</Button>
          </StyledNotificationActionItem>
        </StyledNotificationActionBar>
        {guess.state !== 'pending' && guess.additionalNotes && (
          <>
            <div>
              Additional notes:
            </div>
            <div
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: markdown(guess.additionalNotes) }}
            />
          </>
        )}
        {guess.state === 'pending' && stageTwoSection}
      </Toast.Body>
    </Toast>
  );
});

enum DiscordMessageStatus {
  IDLE = 'idle',
  LINKING = 'linking',
  ERROR = 'error',
  SUCCESS = 'success',
}

type DiscordMessageState = {
  status: DiscordMessageStatus;
  error?: string;
}

const DiscordMessage = React.memo(({ onDismiss }: {
  onDismiss: () => void;
}) => {
  const [state, setState] = useState<DiscordMessageState>({ status: DiscordMessageStatus.IDLE });

  const requestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setState({ status: DiscordMessageStatus.IDLE });
      return;
    }

    linkUserDiscordAccount.call({ key: token, secret }, (error) => {
      if (error) {
        setState({ status: DiscordMessageStatus.ERROR, error: error.message });
      } else {
        setState({ status: DiscordMessageStatus.IDLE });
      }
    });
  }, []);

  const initiateOauthFlow = useCallback(() => {
    setState({ status: DiscordMessageStatus.LINKING });
    requestDiscordCredential(requestComplete);
  }, [requestComplete]);

  const msg = 'It looks like you\'re not in our Discord server, which Jolly Roger manages access to.  Get added:';
  const actions = [
    <StyledNotificationActionItem key="invite">
      <Button
        variant="outline-secondary"
        disabled={!(state.status === DiscordMessageStatus.IDLE || state.status === DiscordMessageStatus.ERROR)}
        onClick={initiateOauthFlow}
      >
        Add me
      </Button>
    </StyledNotificationActionItem>,
  ];

  return (
    <Toast onClose={onDismiss}>
      <Toast.Header>
        <strong className="me-auto">
          Discord account not linked
        </strong>
      </Toast.Header>
      <Toast.Body>
        <StyledNotificationRow>
          {msg}
        </StyledNotificationRow>
        <StyledNotificationActionBar>
          {actions}
        </StyledNotificationActionBar>
        {state.status === DiscordMessageStatus.ERROR ? state.error! : null}
      </Toast.Body>
    </Toast>
  );
});

const AnnouncementMessage = React.memo(({
  id, announcement, createdByDisplayName,
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
    <Toast onClose={onDismiss}>
      <Toast.Header>
        <strong className="me-auto">
          Announcement
        </strong>
        <StyledNotificationTimestamp>
          {calendarTimeFormat(announcement.createdAt)}
        </StyledNotificationTimestamp>
      </Toast.Header>
      <Toast.Body>
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: markdown(announcement.message) }}
        />
        <div>
          {'- '}
          {createdByDisplayName}
        </div>
      </Toast.Body>
    </Toast>
  );
});

enum UpdateGoogleScriptStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  ERROR = 'error',
}

type UpdateGoogleScriptState = {
  status: Exclude<UpdateGoogleScriptStatus, UpdateGoogleScriptStatus.ERROR>;
} | {
  status: UpdateGoogleScriptStatus.ERROR;
  error: string;
};

const UpdateGoogleScriptMessage = ({ onDismiss }: {
  onDismiss: () => void;
}) => {
  const [state, setState] = useState<UpdateGoogleScriptState>({ status: UpdateGoogleScriptStatus.IDLE });

  const updateGoogleScript = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setState({ status: UpdateGoogleScriptStatus.PENDING });
    configureEnsureGoogleScript.call((error) => {
      if (error) {
        setState({ status: UpdateGoogleScriptStatus.ERROR, error: error.message });
      } else {
        setState({ status: UpdateGoogleScriptStatus.IDLE });
      }
    });
  }, []);

  return (
    <Toast onClose={onDismiss}>
      <Toast.Header>
        <strong className="me-auto">
          Update Google Script
        </strong>
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
                  {' '}
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

const ProfileMissingMessage = ({ onDismiss }: {
  onDismiss: () => void;
}) => {
  return (
    <Toast onClose={onDismiss}>
      <Toast.Header>
        <strong className="me-auto">
          Profile missing
        </strong>
      </Toast.Header>
      <Toast.Body>
        Somehow you don&apos;t seem to have a profile.  (This can happen if you wind
        up having to do a password reset before you successfully log in for the
        first time.)  Please set a display name for yourself via
        {' '}
        <Link to="/users/me">
          the profile page
        </Link>
        .
      </Toast.Body>
    </Toast>
  );
};

const ChatNotificationMessage = ({
  cn, hunt, puzzle, senderDisplayName,
}: {
  cn: ChatNotificationType;
  hunt: HuntType;
  puzzle: PuzzleType;
  senderDisplayName: string;
}) => {
  const id = cn._id;
  const dismiss = useCallback(() => dismissChatNotification.call({ chatNotificationId: id }), [id]);

  return (
    <Toast onClose={dismiss}>
      <Toast.Header>
        <strong className="me-auto">
          Mention on
          {' '}
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
          {senderDisplayName}
          {': '}
          <div>
            {cn.text}
          </div>
        </div>
      </Toast.Body>
    </Toast>
  );
};

const StyledToastContainer = styled(ToastContainer)`
  z-index: 1050;

  >*:not(:last-child) {
    // I like these toasts packed a little more efficiently
    margin-bottom: 0.5rem;
  }
`;

const NotificationCenter = () => {
  const showGoogleScriptInfo = useTracker(() => {
    return isAdmin(Meteor.user()) &&
      !Flags.active('disable.google') &&
      ServiceConfiguration.configurations.findOne({ service: 'google' });
  }, []);
  useSubscribe(showGoogleScriptInfo ? 'googleScriptInfo' : undefined);
  const showUpdateGoogleScript = useTracker(() => {
    return showGoogleScriptInfo ? GoogleScriptInfo.findOne()?.outOfDate : false;
  }, [showGoogleScriptInfo]);

  const fetchPendingGuesses = useTracker(() => userIsOperatorForAnyHunt(Meteor.user()), []);
  const pendingGuessesLoading = useSubscribe(fetchPendingGuesses ? 'pendingGuesses' : undefined);

  const [operatorActionsHidden = {}] = useOperatorActionsHidden();

  const pendingAnnouncementsLoading = useSubscribe('pendingAnnouncements');

  const disableDingwords = useTracker(() => Flags.active('disable.dingwords'));
  const chatNotificationsLoading = useSubscribe(disableDingwords ? undefined : 'chatNotifications');

  const loading =
    pendingGuessesLoading() ||
    pendingAnnouncementsLoading() ||
    chatNotificationsLoading();

  const discordEnabledOnServer = useTracker(
    () => !!ServiceConfiguration.configurations.findOne({ service: 'discord' }) && !Flags.active('disable.discord'),
    []
  );
  const { hasOwnProfile, discordConfiguredByUser } = useTracker(() => {
    const user = Meteor.user()!;
    return {
      hasOwnProfile: !!user.displayName,
      discordConfiguredByUser: !!user.discordAccount,
    };
  }, []);

  // Lookup tables to support guesses/pendingAnnouncements/chatNotifications
  const hunts = useTracker(() => (loading ? new Map<string, HuntType>() : indexedById(Hunts.find().fetch())), [loading]);
  const puzzles = useTracker(() => (loading ? new Map<string, PuzzleType>() : indexedById(Puzzles.find().fetch())), [loading]);
  const displayNames = useTracker(() => (loading ? {} : indexedDisplayNames()), [loading]);
  const announcements = useTracker(() => (loading ? new Map<string, AnnouncementType>() : indexedById(Announcements.find().fetch())), [loading]);

  const [recentGuessEpoch, setRecentGuessEpoch] = useState<number>(Date.now() - LINGER_PERIOD);
  const guesses = useTracker(() => (
    loading || !fetchPendingGuesses ?
      [] :
      Guesses.find({
        $or: [
          { state: 'pending' },
          { updatedAt: { $gt: new Date(recentGuessEpoch) } },
        ],
      }, { sort: { createdAt: 1 } }).fetch()
  ), [loading, fetchPendingGuesses, recentGuessEpoch]);
  const pendingAnnouncements = useTracker(() => (
    loading ?
      [] :
      PendingAnnouncements.find({ user: Meteor.userId()! }, { sort: { createdAt: 1 } }).fetch()
  ), [loading]);
  const chatNotifications = useTracker(() => (
    loading || disableDingwords ?
      [] :
      ChatNotifications.find({}, { sort: { timestamp: 1 } }).fetch()
  ), [loading, disableDingwords]);

  const [hideUpdateGoogleScriptMessage, setHideUpdateGoogleScriptMessage] = useState<boolean>(false);
  const [hideDiscordSetupMessage, setHideDiscordSetupMessage] = useState<boolean>(false);
  const [hideProfileSetupMessage, setHideProfileSetupMessage] = useState<boolean>(false);
  const [dismissedGuesses, setDismissedGuesses] = useState<Record<string, Date>>({});

  const onHideUpdateGoogleScriptMessage = useCallback(() => {
    setHideUpdateGoogleScriptMessage(true);
  }, []);

  const onHideDiscordSetupMessage = useCallback(() => {
    setHideDiscordSetupMessage(true);
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
    const lingeringGuesses = guesses.filter((g) => g.state !== 'pending');
    if (lingeringGuesses.length === 0) {
      return () => { /* no unwind */ };
    }

    const earliestLingerUpdatedAt = Math.min(...lingeringGuesses.map((g) => g.updatedAt?.getTime() ?? 0));
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
  const messages = [] as JSX.Element[];

  if (showUpdateGoogleScript && !hideUpdateGoogleScriptMessage) {
    messages.push(<UpdateGoogleScriptMessage
      onDismiss={onHideUpdateGoogleScriptMessage}
      key="updateGoogleScript"
    />);
  }

  if (!hasOwnProfile && !hideProfileSetupMessage) {
    messages.push(<ProfileMissingMessage
      key="profile"
      onDismiss={onHideProfileSetupMessage}
    />);
  }

  if (discordEnabledOnServer &&
    !discordConfiguredByUser &&
    !hideDiscordSetupMessage) {
    messages.push(<DiscordMessage key="discord" onDismiss={onHideDiscordSetupMessage} />);
  }

  guesses.forEach((g) => {
    const dismissedAt = dismissedGuesses[g._id];
    if (dismissedAt && dismissedAt > (g.updatedAt ?? g.createdAt)) return;
    if (operatorActionsHidden[g.hunt]) return;
    messages.push(<GuessMessage
      key={g._id}
      guess={g}
      puzzle={puzzles.get(g.puzzle)!}
      hunt={hunts.get(g.hunt)!}
      guesser={displayNames[g.createdBy]!}
      onDismiss={dismissGuess}
    />);
  });

  pendingAnnouncements.forEach((pa) => {
    messages.push(
      <AnnouncementMessage
        key={pa._id}
        id={pa._id}
        announcement={announcements.get(pa.announcement)!}
        createdByDisplayName={displayNames[pa.createdBy]!}
      />
    );
  });

  chatNotifications.forEach((cn) => {
    messages.push(
      <ChatNotificationMessage
        key={cn._id}
        cn={cn}
        hunt={hunts.get(cn.hunt)!}
        puzzle={puzzles.get(cn.puzzle)!}
        senderDisplayName={displayNames[cn.sender]!}
      />
    );
  });

  return (
    <StyledToastContainer position="bottom-end" className="p-3 position-fixed">
      {messages}
    </StyledToastContainer>
  );
};

export default NotificationCenter;
