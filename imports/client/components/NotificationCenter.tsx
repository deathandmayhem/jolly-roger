import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { useTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration } from 'meteor/service-configuration';
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
import Flags from '../../flags';
import { calendarTimeFormat } from '../../lib/calendarTimeFormat';
import Announcements from '../../lib/models/announcements';
import ChatNotifications from '../../lib/models/chat_notifications';
import Guesses from '../../lib/models/guesses';
import Hunts from '../../lib/models/hunts';
import PendingAnnouncements from '../../lib/models/pending_announcements';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { deprecatedIsActiveOperator } from '../../lib/permission_stubs';
import { AnnouncementType } from '../../lib/schemas/announcement';
import { ChatNotificationType } from '../../lib/schemas/chat_notification';
import { GuessType } from '../../lib/schemas/guess';
import { HuntType } from '../../lib/schemas/hunt';
import { PendingAnnouncementType } from '../../lib/schemas/pending_announcement';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { guessURL } from '../../model-helpers';
import { requestDiscordCredential } from '../discord';
import markdown from '../markdown';

/* eslint-disable max-len */

const Breakable = styled.span`
  word-wrap: break-word;
`;

const StyledDismissButton = styled.button`
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  font-size: 20px;
  font-weight: bold;
  right: 0px;
  top: 0px;
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
  display: block;
  list-style-type: none;
  margin: 0px;
  padding: 0px;
  display: flex;
  flex-direction: row;
`;

const StyledNotificationActionItem = styled.li`
  margin-left: 0px;
  margin-top: 8px;
  margin-right: 8px;
  margin-bottom: 4px;
  display: inline-block;

  a, button {
    display: inline-block;
    border: none;
    padding: 4px 10px;
    border-radius: 4px;
    background-color: #2e2e2e;
    color: #aaaaaa;
    &:hover {
      color: #f0f0f0;
      cursor: pointer;
      text-decoration: none;
    }
  }
`;

interface MessengerDismissButtonProps {
  onDismiss: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const MessengerDismissButton = React.memo((props: MessengerDismissButtonProps) => {
  return <StyledDismissButton type="button" onClick={props.onDismiss}>×</StyledDismissButton>;
});

const MessengerContent = styled.div`
  overflow-x: hidden; // overflow-wrap on children just overflows the box without this
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 10px;
  padding-bottom: 10px;
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

interface GuessMessageProps {
  guess: GuessType;
  puzzle: PuzzleType;
  hunt: HuntType;
  guesser: string;
  onDismiss: (guessId: string) => void;
}

const GuessMessage = React.memo((props: GuessMessageProps) => {
  const {
    guess, puzzle, hunt, guesser, onDismiss,
  } = props;

  const markCorrect = useCallback(() => {
    Meteor.call('markGuessCorrect', guess._id);
  }, [guess._id]);

  const markIncorrect = useCallback(() => {
    Meteor.call('markGuessIncorrect', guess._id);
  }, [guess._id]);

  const markRejected = useCallback(() => {
    Meteor.call('markGuessRejected', guess._id);
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
              <CopyToClipboard text={guess.guess}>
                <button type="button" aria-label="Copy"><FontAwesomeIcon icon={faCopy} /></button>
              </CopyToClipboard>
            </OverlayTrigger>
          </StyledNotificationActionItem>
          <StyledNotificationActionItem>
            <OverlayTrigger placement="top" overlay={jrLinkTooltip}>
              <Link to={linkTarget}><FontAwesomeIcon icon={faSkullCrossbones} /></Link>
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

interface DiscordMessageProps {
  onDismiss: () => void;
}

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

const DiscordMessage = React.memo((props: DiscordMessageProps) => {
  const [state, setState] = useState<DiscordMessageState>({ status: DiscordMessageStatus.IDLE });

  const requestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setState({ status: DiscordMessageStatus.IDLE });
      return;
    }

    Meteor.call('linkUserDiscordAccount', token, secret, (error?: Error) => {
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
      <MessengerDismissButton onDismiss={props.onDismiss} />
    </StyledNotificationMessage>
  );
});

interface AnnouncementMessageProps {
  id: string;
  announcement: AnnouncementType;
  createdByDisplayName: string;
}

const AnnouncementMessage = React.memo((props: AnnouncementMessageProps) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const onDismiss = useCallback(() => {
    setDismissed(true);
    Meteor.call('dismissPendingAnnouncement', props.id);
  }, [props.id]);

  if (dismissed) {
    return null;
  }

  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: markdown(props.announcement.message) }}
        />
        <footer>
          {'- '}
          {props.createdByDisplayName}
          {', '}
          {calendarTimeFormat(props.announcement.createdAt)}
        </footer>
      </MessengerContent>
      <MessengerDismissButton onDismiss={onDismiss} />
    </StyledNotificationMessage>
  );
});

interface ProfileMissingMessageProps {
  onDismiss: () => void;
}
function ProfileMissingMessage(props: ProfileMissingMessageProps) {
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
      <MessengerDismissButton onDismiss={props.onDismiss} />
    </StyledNotificationMessage>
  );
}

interface ChatNotificationMessageProps {
  // TODO: add the requisite fields
  cn: NotificationCenterChatNotification;
  onDismiss: () => void;
}
function ChatNotificationMessage(props: ChatNotificationMessageProps) {
  return (
    <StyledNotificationMessage>
      <MessengerSpinner />
      <MessengerContent>
        <Link to={`/hunts/${props.cn.hunt._id}/puzzles/${props.cn.puzzle._id}`}>
          {props.cn.puzzle.title}
        </Link>
        <div>
          {props.cn.senderDisplayName}
          {': '}
          <div>
            {props.cn.cn.text}
          </div>
        </div>
      </MessengerContent>
      <MessengerDismissButton onDismiss={props.onDismiss} />
    </StyledNotificationMessage>
  );
}

interface NotificationCenterAnnouncement {
  pa: PendingAnnouncementType;
  announcement: AnnouncementType;
  createdByDisplayName: string;
}

interface NotificationCenterGuess {
  guess: GuessType;
  puzzle: PuzzleType;
  hunt: HuntType;
  guesser: string;
}

interface NotificationCenterChatNotification {
  cn: ChatNotificationType;
  hunt: HuntType;
  puzzle: PuzzleType;
  senderDisplayName: string;
}

type NotificationCenterTracker = {
  ready: boolean;
  announcements?: NotificationCenterAnnouncement[];
  guesses?: NotificationCenterGuess[];
  chatNotifications?: NotificationCenterChatNotification[];
  discordEnabledOnServer?: boolean;
  discordConfiguredByUser?: boolean;
  hasOwnProfile?: boolean;
}

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
  const tracker: NotificationCenterTracker = useTracker(() => {
    const canUpdateGuesses = deprecatedIsActiveOperator(Meteor.userId());

    // Yes this is hideous, but it just makes the logic easier
    let pendingGuessHandle = { ready: () => true };
    if (canUpdateGuesses) {
      pendingGuessHandle = Meteor.subscribe('pendingGuesses');
    }

    // This is overly broad, but we likely already have the data cached locally
    const selfHandle = Meteor.subscribe('mongo.profiles', { _id: Meteor.userId() });
    const displayNamesHandle = Profiles.subscribeDisplayNames();
    const announcementsHandle = Meteor.subscribe('mongo.announcements');

    const disableDingwords = Flags.active('disable.dingwords');

    let chatNotificationsHandle = { ready: () => true };
    if (!disableDingwords) {
      chatNotificationsHandle = Meteor.subscribe('chatNotifications');
    }

    const query = {
      user: Meteor.userId()!,
    };
    const paHandle = Meteor.subscribe('mongo.pending_announcements', query);

    // Don't even try to put things together until we have the announcements loaded
    if (!selfHandle.ready() || !displayNamesHandle.ready() || !announcementsHandle.ready() ||
      !chatNotificationsHandle.ready()) {
      return { ready: false };
    }

    const ownProfile = Profiles.findOne(Meteor.userId()!);
    const discordEnabledOnServer = !!ServiceConfiguration.configurations.findOne({ service: 'discord' }) && !Flags.active('disable.discord');

    const data = {
      ready: pendingGuessHandle.ready() && paHandle.ready(),
      announcements: [] as NotificationCenterAnnouncement[],
      guesses: [] as NotificationCenterGuess[],
      chatNotifications: [] as NotificationCenterChatNotification[],
      discordEnabledOnServer,
      discordConfiguredByUser: !!(ownProfile && ownProfile.discordAccount),
      hasOwnProfile: !!(ownProfile),
    };

    if (canUpdateGuesses) {
      Guesses.find({ state: 'pending' }, { sort: { createdAt: 1 } }).forEach((guess) => {
        data.guesses.push({
          guess,
          puzzle: Puzzles.findOne(guess.puzzle)!,
          hunt: Hunts.findOne(guess.hunt)!,
          guesser: Profiles.findOne(guess.createdBy)!.displayName,
        });
      });
    }

    PendingAnnouncements.find(query, { sort: { createdAt: 1 } }).forEach((pa) => {
      const announcement = Announcements.findOne(pa.announcement)!;
      data.announcements.push({
        pa,
        announcement,
        createdByDisplayName: Profiles.findOne(announcement.createdBy)!.displayName,
      });
    });

    if (!disableDingwords) {
      ChatNotifications.find({}, { sort: { timestamp: 1 } }).forEach((cn) => {
        const senderProfile = Profiles.findOne(cn.sender);
        const senderDisplayName = (senderProfile && senderProfile.displayName) || '(no display name)';
        data.chatNotifications.push({
          cn,
          puzzle: Puzzles.findOne(cn.puzzle)!,
          hunt: Hunts.findOne(cn.hunt)!,
          senderDisplayName,
        });
      });
    }

    return data;
  }, []);

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

  const dismissChatNotification = useCallback((chatNotificationId: string) => {
    Meteor.call('dismissChatNotification', chatNotificationId);
  }, []);

  if (!tracker.ready || !tracker.guesses || !tracker.announcements || !tracker.chatNotifications) {
    return <div />;
  }

  // Build a list of uninstantiated messages with their props, then create them
  const messages: any = [];

  if (!tracker.hasOwnProfile && !hideProfileSetupMessage) {
    messages.push(<ProfileMissingMessage
      key="profile"
      onDismiss={onHideProfileSetupMessage}
    />);
  }

  if (tracker.discordEnabledOnServer &&
    !tracker.discordConfiguredByUser &&
    !hideDiscordSetupMessage) {
    messages.push(<DiscordMessage key="discord" onDismiss={onHideDiscordSetupMessage} />);
  }

  tracker.guesses.forEach((g) => {
    if (dismissedGuesses[g.guess._id]) return;
    messages.push(<GuessMessage
      key={g.guess._id}
      guess={g.guess}
      puzzle={g.puzzle}
      hunt={g.hunt}
      guesser={g.guesser}
      onDismiss={dismissGuess}
    />);
  });

  tracker.announcements.forEach((a) => {
    messages.push(
      <AnnouncementMessage
        key={a.pa._id}
        id={a.pa._id}
        announcement={a.announcement}
        createdByDisplayName={a.createdByDisplayName}
      />
    );
  });

  tracker.chatNotifications.forEach((cn) => {
    messages.push(
      <ChatNotificationMessage
        key={cn.cn._id}
        cn={cn}
        onDismiss={() => { dismissChatNotification(cn.cn._id); }}
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
