import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { OAuth } from 'meteor/oauth';
import { withTracker } from 'meteor/react-meteor-data';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons/faSkullCrossbones';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import DOMPurify from 'dompurify';
import marked from 'marked';
import moment from 'moment';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import Flags from '../../flags';
import Announcements from '../../lib/models/announcements';
import ChatNotifications from '../../lib/models/chat_notifications';
import Guesses from '../../lib/models/guess';
import Hunts from '../../lib/models/hunts';
import PendingAnnouncements from '../../lib/models/pending_announcements';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { AnnouncementType } from '../../lib/schemas/announcements';
import { ChatNotificationType } from '../../lib/schemas/chat_notifications';
import { GuessType } from '../../lib/schemas/guess';
import { HuntType } from '../../lib/schemas/hunts';
import { PendingAnnouncementType } from '../../lib/schemas/pending_announcements';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { guessURL } from '../../model-helpers';
import { requestDiscordCredential } from '../discord';

/* eslint-disable max-len */

interface MessengerDismissButtonProps {
  onDismiss: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

class MessengerDismissButton extends React.PureComponent<MessengerDismissButtonProps> {
  render() {
    return <button type="button" className="dismiss" onClick={this.props.onDismiss}>×</button>;
  }
}

interface MessengerContentProps {
  dismissable?: boolean;
  children: React.ReactNode;
}

class MessengerContent extends React.PureComponent<MessengerContentProps> {
  render() {
    const { dismissable, children } = this.props;
    const classes = classnames('content', { dismissable });
    return <div className={classes}>{children}</div>;
  }
}

class MessengerSpinner extends React.PureComponent {
  render() {
    return (
      <div className="spinner-box">
        <div className="spinner" />
      </div>
    );
  }
}

interface GuessMessageProps {
  guess: GuessType;
  puzzle: PuzzleType;
  hunt: HuntType;
  guesser: string;
  onDismiss: (guessId: string) => void;
}

class GuessMessage extends React.PureComponent<GuessMessageProps> {
  markCorrect = () => {
    Meteor.call('markGuessCorrect', this.props.guess._id);
  };

  markIncorrect = () => {
    Meteor.call('markGuessIncorrect', this.props.guess._id);
  };

  markRejected = () => {
    Meteor.call('markGuessRejected', this.props.guess._id);
  };

  dismissGuess = () => {
    this.props.onDismiss(this.props.guess._id);
  };

  render() {
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

    const linkTarget = `/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`;

    return (
      <li>
        <MessengerSpinner />
        <MessengerContent dismissable>
          <div>
            Guess for
            {' '}
            {this.props.puzzle.title}
            {' '}
            from
            {' '}
            <span className="breakable">{this.props.guesser}</span>
            :
            {' '}
            <span className="breakable">{this.props.guess.guess}</span>
          </div>
          <div>
            <OverlayTrigger placement="bottom" overlay={directionTooltip}>
              <span>
                Solve direction:
                {' '}
                {this.props.guess.direction}
              </span>
            </OverlayTrigger>
          </div>
          <div>
            <OverlayTrigger placement="bottom" overlay={confidenceTooltip}>
              <span>
                Confidence:
                {' '}
                {this.props.guess.confidence}
                %
              </span>
            </OverlayTrigger>
          </div>
          <ul className="actions">
            <li>
              <OverlayTrigger placement="top" overlay={copyTooltip}>
                <CopyToClipboard text={this.props.guess.guess}>
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
                <a href={guessURL(this.props.hunt, this.props.puzzle)} target="_blank" rel="noopener noreferrer">
                  <FontAwesomeIcon icon={faPuzzlePiece} />
                </a>
              </OverlayTrigger>
            </li>
          </ul>
          <ul className="actions">
            <li><button type="button" onClick={this.markCorrect}>Correct</button></li>
            <li><button type="button" onClick={this.markIncorrect}>Incorrect</button></li>
            <li><button type="button" onClick={this.markRejected}>Reject</button></li>
          </ul>
        </MessengerContent>
        <MessengerDismissButton onDismiss={this.dismissGuess} />
      </li>
    );
  }
}

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

class DiscordMessage extends React.PureComponent<DiscordMessageProps, DiscordMessageState> {
  constructor(props: DiscordMessageProps) {
    super(props);
    this.state = {
      status: DiscordMessageStatus.IDLE,
    };
  }

  requestComplete = (token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      this.setState({ status: DiscordMessageStatus.IDLE });
      return;
    }

    Meteor.call('linkUserDiscordAccount', token, secret, (error?: Error) => {
      if (error) {
        this.setState({ status: DiscordMessageStatus.ERROR, error: error.message });
      } else {
        this.setState({ status: DiscordMessageStatus.IDLE });
      }
    });
  }

  initiateOauthFlow = () => {
    this.setState({ status: DiscordMessageStatus.LINKING });
    requestDiscordCredential(this.requestComplete);
  };

  reset = () => {
    this.setState({ status: DiscordMessageStatus.IDLE });
  };

  render() {
    const msg = 'It looks like you\'re not in our Discord server, which Jolly Roger manages access to.  Get added:';
    const actions = [
      <li key="invite">
        <button
          type="button"
          disabled={!(this.state.status === DiscordMessageStatus.IDLE || this.state.status === DiscordMessageStatus.ERROR)}
          onClick={this.initiateOauthFlow}
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
          {this.state.status === DiscordMessageStatus.ERROR ? this.state.error! : null}
        </MessengerContent>
        <MessengerDismissButton onDismiss={this.props.onDismiss} />
      </li>
    );
  }
}

interface AnnouncementMessageProps {
  id: string;
  announcement: AnnouncementType;
  createdByDisplayName: string;
}

class AnnouncementMessage extends React.PureComponent<AnnouncementMessageProps> {
  onDismiss = () => {
    PendingAnnouncements.remove(this.props.id);
  };

  render() {
    return (
      <li>
        <MessengerSpinner />
        <MessengerContent dismissable>
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: marked(DOMPurify.sanitize(this.props.announcement.message)) }}
          />
          <footer>
            {'- '}
            {this.props.createdByDisplayName}
            {', '}
            {moment(this.props.announcement.createdAt).calendar()}
          </footer>
        </MessengerContent>
        <MessengerDismissButton onDismiss={this.onDismiss} />
      </li>
    );
  }
}

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

type NotificationCenterProps = {
  ready: boolean;
  announcements?: NotificationCenterAnnouncement[];
  guesses?: NotificationCenterGuess[];
  chatNotifications?: NotificationCenterChatNotification[];
  discordEnabledOnServer?: boolean;
  discordConfiguredByUser?: boolean;
  hasOwnProfile?: boolean;
}

interface NotificationCenterState {
  hideDiscordSetupMessage: boolean;
  hideProfileSetupMessage: boolean;
  dismissedGuesses: Record<string, boolean>;
}

class NotificationCenter extends React.Component<NotificationCenterProps, NotificationCenterState> {
  constructor(props: NotificationCenterProps) {
    super(props);
    this.state = {
      hideDiscordSetupMessage: false,
      hideProfileSetupMessage: false,
      dismissedGuesses: {},
    };
  }

  hideDiscordSetupMessage = () => {
    this.setState({
      hideDiscordSetupMessage: true,
    });
  };

  hideProfileSetupMessage = () => {
    this.setState({
      hideProfileSetupMessage: true,
    });
  };

  dismissGuess = (guessId: string) => {
    const newState: Record<string, boolean> = {};
    newState[guessId] = true;
    Object.assign(newState, this.state.dismissedGuesses);
    this.setState({
      dismissedGuesses: newState,
    });
  };

  dismissChatNotification = (chatNotificationId: string) => {
    Meteor.call('dismissChatNotification', chatNotificationId);
  };

  render() {
    if (!this.props.ready || !this.props.guesses || !this.props.announcements || !this.props.chatNotifications) {
      return <div />;
    }

    // Build a list of uninstantiated messages with their props, then create them
    const messages: any = [];

    if (!this.props.hasOwnProfile && !this.state.hideProfileSetupMessage) {
      messages.push(<ProfileMissingMessage
        key="profile"
        onDismiss={this.hideProfileSetupMessage}
      />);
    }

    if (this.props.discordEnabledOnServer &&
        !this.props.discordConfiguredByUser &&
        !this.state.hideDiscordSetupMessage) {
      messages.push(<DiscordMessage key="discord" onDismiss={this.hideDiscordSetupMessage} />);
    }

    this.props.guesses.forEach((g) => {
      if (this.state.dismissedGuesses[g.guess._id]) return;
      messages.push(<GuessMessage
        key={g.guess._id}
        guess={g.guess}
        puzzle={g.puzzle}
        hunt={g.hunt}
        guesser={g.guesser}
        onDismiss={this.dismissGuess}
      />);
    });

    this.props.announcements.forEach((a) => {
      messages.push(
        <AnnouncementMessage
          key={a.pa._id}
          id={a.pa._id}
          announcement={a.announcement}
          createdByDisplayName={a.createdByDisplayName}
        />
      );
    });

    this.props.chatNotifications.forEach((cn) => {
      messages.push(
        <ChatNotificationMessage
          key={cn.cn._id}
          cn={cn}
          onDismiss={() => { this.dismissChatNotification(cn.cn._id); }}
        />
      );
    });

    return (
      <ul className="notifications">
        {messages}
      </ul>
    );
  }
}

const NotificationCenterContainer = withTracker((_props: {}): NotificationCenterProps => {
  const canUpdateGuesses = Roles.userHasPermission(Meteor.userId(), 'mongo.guesses.update');

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
})(NotificationCenter);

export default NotificationCenterContainer;
