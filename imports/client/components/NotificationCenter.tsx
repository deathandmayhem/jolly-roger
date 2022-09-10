/* eslint-disable max-len */
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { _ } from 'meteor/underscore';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons/faSkullCrossbones';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useState } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Flags from '../../Flags';
import { calendarTimeFormat } from '../../lib/calendarTimeFormat';
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
import dismissChatNotification from '../../methods/dismissChatNotification';
import dismissPendingAnnouncement from '../../methods/dismissPendingAnnouncement';
import linkUserDiscordAccount from '../../methods/linkUserDiscordAccount';
import setGuessState from '../../methods/setGuessState';
import { guessURL } from '../../model-helpers';
import { requestDiscordCredential } from '../discord';
import { useOperatorActionsHidden } from '../hooks/persisted-state';
import markdown from '../markdown';
import Breakable from './styling/Breakable';

const StyledDismissButton = styled.button`
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  font-size: 20px;
  font-weight: bold;
  right: 0;
  top: 0;
  color: #888;

  &:hover {
    color: #f0f0f0;
  }
`;

const StyledNotificationMessage = styled.li`
  width: 100%;
  position: relative;
  background-color: #404040;
  color: #f0f0f0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: flex-start;
  overflow: hidden;

  &:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #595959;
  }

  &:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const StyledNotificationActionBar = styled.ul`
  display: flex;
  list-style-type: none;
  margin: 0;
  padding: 0;
  flex-direction: row;
`;

const StyledNotificationActionItem = styled.li`
  margin: 8px 8px 4px 0;
  display: inline-block;

  a,
  button {
    display: inline-block;
    border: none;
    padding: 4px 10px;
    border-radius: 4px;
    background-color: #2e2e2e;
    color: #aaa;

    &:hover {
      color: #f0f0f0;
      cursor: pointer;
      text-decoration: none;
    }
  }
`;

const MessengerDismissButton = React.memo(({ onDismiss }: {
  onDismiss: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  return <StyledDismissButton type="button" onClick={onDismiss}>×</StyledDismissButton>;
});

const MessengerContent = styled.div`
  overflow-x: hidden; // overflow-wrap on children just overflows the box without this
  padding: 10px;
`;

const StyledSpinnerBox = styled.div`
  background-color: #292929;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 55px;
  flex: 0 0 55px;
`;

const StyledSpinner = styled.div`
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  background-color: #61c4b8;
`;

const MessengerSpinner = React.memo(() => {
  return (
    <StyledSpinnerBox>
      <StyledSpinner />
    </StyledSpinnerBox>
  );
});

const GuessMessage = React.memo(({
  guess, puzzle, hunt, guesser, onDismiss,
}: {
  guess: GuessType;
  puzzle: PuzzleType;
  hunt: HuntType;
  guesser: string;
  onDismiss: (guessId: string) => void;
}) => {
  const markCorrect = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'correct' });
  }, [guess._id]);

  const markIncorrect = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'incorrect' });
  }, [guess._id]);

  const markRejected = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'rejected' });
  }, [guess._id]);

  const dismissGuess = useCallback(() => {
    onDismiss(guess._id);
  }, [onDismiss, guess._id]);

  const directionTooltip = (
    <Tooltip id="direction-tooltip">
      Direction this puzzle was solved, ranging from completely backsolved (-10) to completely forward solved (10)
    </Tooltip>
  );
  const confidenceTooltip = (
    <Tooltip id="confidence-tooltip">
      Submitter-estimated likelihood that this answer is correct
    </Tooltip>
  );
  const copyTooltip = (
    <Tooltip id="copy-tooltip">
      Copy to clipboard
    </Tooltip>
  );
  const jrLinkTooltip = (
    <Tooltip id="jr-link-tooltip">
      Open Jolly Roger page
    </Tooltip>
  );
  const extLinkTooltip = (
    <Tooltip id="ext-link-tooltip">
      Open puzzle
    </Tooltip>
  );

  const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;

  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        <div>
          Guess for
          {' '}
          {puzzle.title}
          {' '}
          from
          {' '}
          <Breakable>{guesser}</Breakable>
          :
          {' '}
          <Breakable>{guess.guess}</Breakable>
        </div>
        <div>
          <OverlayTrigger placement="bottom" overlay={directionTooltip}>
            <span>
              Solve direction:
              {' '}
              {guess.direction}
            </span>
          </OverlayTrigger>
        </div>
        <div>
          <OverlayTrigger placement="bottom" overlay={confidenceTooltip}>
            <span>
              Confidence:
              {' '}
              {guess.confidence}
              %
            </span>
          </OverlayTrigger>
        </div>
        <StyledNotificationActionBar>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={copyTooltip}>
              {({ ref, ...triggerHandler }) => (
                <CopyToClipboard text={guess.guess} {...triggerHandler}>
                  <button ref={ref} type="button" aria-label="Copy"><FontAwesomeIcon icon={faCopy} /></button>
                </CopyToClipboard>
              )}
            </OverlayTrigger>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={jrLinkTooltip}>
              <a href={linkTarget} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faSkullCrossbones} />
              </a>
            </OverlayTrigger>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={extLinkTooltip}>
              <a href={guessURL(hunt, puzzle)} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faPuzzlePiece} />
              </a>
            </OverlayTrigger>
          </StyledNotificationActionItem>
        </StyledNotificationActionBar>
        <StyledNotificationActionBar>
          <StyledNotificationActionItem><button type="button" onClick={markCorrect}>Correct</button></StyledNotificationActionItem>
          <StyledNotificationActionItem><button type="button" onClick={markIncorrect}>Incorrect</button></StyledNotificationActionItem>
          <StyledNotificationActionItem><button type="button" onClick={markRejected}>Reject</button></StyledNotificationActionItem>
        </StyledNotificationActionBar>
      </MessengerContent>
      <MessengerDismissButton onDismiss={dismissGuess} />
    </StyledNotificationMessage>
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
      <button
        type="button"
        disabled={!(state.status === DiscordMessageStatus.IDLE || state.status === DiscordMessageStatus.ERROR)}
        onClick={initiateOauthFlow}
      >
        Add me
      </button>
    </StyledNotificationActionItem>,
  ];

  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        {msg}
        <StyledNotificationActionBar>
          {actions}
        </StyledNotificationActionBar>
        {state.status === DiscordMessageStatus.ERROR ? state.error! : null}
      </MessengerContent>
      <MessengerDismissButton onDismiss={onDismiss} />
    </StyledNotificationMessage>
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
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: markdown(announcement.message) }}
        />
        <footer>
          {'- '}
          {createdByDisplayName}
          {', '}
          {calendarTimeFormat(announcement.createdAt)}
        </footer>
      </MessengerContent>
      <MessengerDismissButton onDismiss={onDismiss} />
    </StyledNotificationMessage>
  );
});

const ProfileMissingMessage = ({ onDismiss }: {
  onDismiss: () => void;
}) => {
  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        Somehow you don&apos;t seem to have a profile.  (This can happen if you wind
        up having to do a password reset before you successfully log in for the
        first time.)  Please set a display name for yourself via
        {' '}
        <Link to="/users/me">
          the profile page
        </Link>
        .
      </MessengerContent>
      <MessengerDismissButton onDismiss={onDismiss} />
    </StyledNotificationMessage>
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
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        <Link to={`/hunts/${hunt._id}/puzzles/${puzzle._id}`}>
          {puzzle.title}
        </Link>
        <div>
          {senderDisplayName}
          {': '}
          <div>
            {cn.text}
          </div>
        </div>
        <footer>
          {calendarTimeFormat(cn.createdAt)}
        </footer>
      </MessengerContent>
      <MessengerDismissButton onDismiss={dismiss} />
    </StyledNotificationMessage>
  );
};

const StyledNotificationCenter = styled.ul`
  position: fixed;
  width: 350px;
  top: 20px;
  right: 20px;
  margin: 0;
  padding: 0;
  z-index: 1050;
`;

const NotificationCenter = () => {
  const fetchPendingGuesses = useTracker(() => userIsOperatorForAnyHunt(Meteor.userId()), []);
  const pendingGuessesLoading = useSubscribe(fetchPendingGuesses ? 'pendingGuesses' : undefined);

  const [operatorActionsHidden = {}] = useOperatorActionsHidden();

  const pendingAnnouncementsLoading = useSubscribe('pendingAnnouncements');

  const disableDingwords = useTracker(() => Flags.active('disable.dingwords'));
  const chatNotificationsLoading = useSubscribe(disableDingwords ? undefined : 'chatNotifications');

  const loading =
    pendingGuessesLoading() ||
    pendingAnnouncementsLoading() ||
    chatNotificationsLoading();

  const discordEnabledOnServer = useTracker(() => (
    !!ServiceConfiguration.configurations.findOne({ service: 'discord' }) && !Flags.active('disable.discord')
  ), []);
  const { hasOwnProfile, discordConfiguredByUser } = useTracker(() => {
    const user = Meteor.user()!;
    return {
      hasOwnProfile: !!(user.displayName),
      discordConfiguredByUser: !!(user.discordAccount),
    };
  }, []);

  // Lookup tables to support guesses/pendingAnnouncements/chatNotifications
  const hunts = useTracker(() => (loading ? {} : _.indexBy(Hunts.find().fetch(), '_id')), [loading]);
  const puzzles = useTracker(() => (loading ? {} : _.indexBy(Puzzles.find().fetch(), '_id')), [loading]);
  const displayNames = useTracker(() => (loading ? {} : indexedDisplayNames()), [loading]);
  const announcements = useTracker(() => (loading ? {} : _.indexBy(Announcements.find().fetch(), '_id')), [loading]);

  const guesses = useTracker(() => (
    loading || !fetchPendingGuesses ?
      [] :
      Guesses.find({ state: 'pending' }, { sort: { createdAt: 1 } }).fetch()
  ), [loading, fetchPendingGuesses]);
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

  const [hideDiscordSetupMessage, setHideDiscordSetupMessage] = useState<boolean>(false);
  const [hideProfileSetupMessage, setHideProfileSetupMessage] = useState<boolean>(false);
  const [dismissedGuesses, setDismissedGuesses] = useState<Record<string, boolean>>({});

  const onHideDiscordSetupMessage = useCallback(() => {
    setHideDiscordSetupMessage(true);
  }, []);

  const onHideProfileSetupMessage = useCallback(() => {
    setHideProfileSetupMessage(true);
  }, []);

  const dismissGuess = useCallback((guessId: string) => {
    setDismissedGuesses((prevDismissedGuesses) => {
      const newState: Record<string, boolean> = {};
      newState[guessId] = true;
      Object.assign(newState, prevDismissedGuesses);
      return newState;
    });
  }, []);

  if (loading) {
    return <div />;
  }

  // Build a list of uninstantiated messages with their props, then create them
  const messages = [] as JSX.Element[];

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
    if (dismissedGuesses[g._id]) return;
    if (operatorActionsHidden[g.hunt]) return;
    messages.push(<GuessMessage
      key={g._id}
      guess={g}
      puzzle={puzzles[g.puzzle]!}
      hunt={hunts[g.hunt]!}
      guesser={displayNames[g.createdBy]!}
      onDismiss={dismissGuess}
    />);
  });

  pendingAnnouncements.forEach((pa) => {
    messages.push(
      <AnnouncementMessage
        key={pa._id}
        id={pa._id}
        announcement={announcements[pa.announcement]!}
        createdByDisplayName={displayNames[pa.createdBy]!}
      />
    );
  });

  chatNotifications.forEach((cn) => {
    messages.push(
      <ChatNotificationMessage
        key={cn._id}
        cn={cn}
        hunt={hunts[cn.hunt]!}
        puzzle={puzzles[cn.puzzle]!}
        senderDisplayName={displayNames[cn.sender]!}
      />
    );
  });

  return (
    <StyledNotificationCenter>
      {messages}
    </StyledNotificationCenter>
  );
};

export default NotificationCenter;
