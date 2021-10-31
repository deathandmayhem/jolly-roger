import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { useTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons/faSkullCrossbones';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React, { useCallback, useState } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
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

interface MessengerDismissButtonProps {
  onDismiss: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const MessengerDismissButton = React.memo((props: MessengerDismissButtonProps) => {
  return <button type="button" className="dismiss" onClick={props.onDismiss}>×</button>;
});

interface MessengerContentProps {
  dismissable?: boolean;
  children: React.ReactNode;
}

const MessengerContent = React.memo((props: MessengerContentProps) => {
  const { dismissable, children } = props;
  const classes = classnames('content', { dismissable });
  return <div className={classes}>{children}</div>;
});

const MessengerSpinner = React.memo(() => {
  return (
    <div className="spinner-box">
      <div className="spinner" />
    </div>
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
    <li>
      <MessengerSpinner />
      <MessengerContent dismissable>
        <div>
          Guess for
          {' '}
          {puzzle.title}
          {' '}
          from
          {' '}
          <span className="breakable">{guesser}</span>
          :
          {' '}
          <span className="breakable">{guess.guess}</span>
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
        <ul className="actions">
          <li>
            <OverlayTrigger placement="top" overlay={copyTooltip}>
              <CopyToClipboard text={guess.guess}>
                <button type="button" aria-label="Copy"><FontAwesomeIcon icon={faCopy} /></button>
              </CopyToClipboard>
            </OverlayTrigger>
          </li>
          <li>
            <OverlayTrigger placement="top" overlay={jrLinkTooltip}>
              <Link to={linkTarget}><FontAwesomeIcon icon={faSkullCrossbones} /></Link>
            </OverlayTrigger>
          </li>
          <li>
            <OverlayTrigger placement="top" overlay={extLinkTooltip}>
              <a href={guessURL(hunt, puzzle)} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faPuzzlePiece} />
              </a>
            </OverlayTrigger>
          </li>
        </ul>
        <ul className="actions">
          <li><button type="button" onClick={markCorrect}>Correct</button></li>
          <li><button type="button" onClick={markIncorrect}>Incorrect</button></li>
          <li><button type="button" onClick={markRejected}>Reject</button></li>
        </ul>
      </MessengerContent>
      <MessengerDismissButton onDismiss={dismissGuess} />
    </li>
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
    <li key="invite">
      <button
        type="button"
        disabled={!(state.status === DiscordMessageStatus.IDLE || state.status === DiscordMessageStatus.ERROR)}
        onClick={initiateOauthFlow}
      >
        Add me
      </button>
    </li>,
  ];

  return (
    <li>
      <MessengerSpinner />
      <MessengerContent>
        {msg}
        <ul className="actions">
          {actions}
        </ul>
        {state.status === DiscordMessageStatus.ERROR ? state.error! : null}
      </MessengerContent>
      <MessengerDismissButton onDismiss={props.onDismiss} />
    </li>
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
    <li>
      <MessengerSpinner />
      <MessengerContent dismissable>
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
    </li>
  );
});

interface ProfileMissingMessageProps {
  onDismiss: () => void;
}
function ProfileMissingMessage(props: ProfileMissingMessageProps) {
  return (
    <li>
      <MessengerSpinner />
      <MessengerContent dismissable>
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
    </li>
  );
}

interface ChatNotificationMessageProps {
  // TODO: add the requisite fields
  cn: NotificationCenterChatNotification;
  onDismiss: () => void;
}
function ChatNotificationMessage(props: ChatNotificationMessageProps) {
  return (
    <li>
      <MessengerSpinner />
      <MessengerContent dismissable>
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
    </li>
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
    <ul className="notifications">
      {messages}
    </ul>
  );
};

export default NotificationCenter;
