import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import DOMPurify from 'dompurify';
import marked from 'marked';
import moment from 'moment';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import Tooltip from 'react-bootstrap/lib/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router';
import Announcements from '../../lib/models/announcements';
import Guesses from '../../lib/models/guess';
import Hunts from '../../lib/models/hunts';
import PendingAnnouncements from '../../lib/models/pending_announcements';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { AnnouncementType } from '../../lib/schemas/announcements';
import { GuessType } from '../../lib/schemas/guess';
import { HuntType } from '../../lib/schemas/hunts';
import { PendingAnnouncementType } from '../../lib/schemas/pending_announcements';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { guessURL } from '../../model-helpers';

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

    return (
      <li>
        <MessengerSpinner />
        <MessengerContent dismissable>
          <div>
            Guess for
            {' '}
            <a href={guessURL(this.props.hunt, this.props.puzzle)} target="_blank" rel="noopener noreferrer">{this.props.puzzle.title}</a>
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
              <CopyToClipboard text={this.props.guess.guess}>
                <button type="button" aria-label="Copy"><FontAwesomeIcon icon={faCopy} /></button>
              </CopyToClipboard>
            </li>
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

interface SlackMessageProps {
  onDismiss: () => void;
}

enum SlackMessageStatus {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  ERROR = 'error',
  SUCCESS = 'success',
}

type SlackMessageState = {
  // eslint-disable-next-line no-restricted-globals
  status: SlackMessageStatus;
  errorMessage?: string;
}

class SlackMessage extends React.PureComponent<SlackMessageProps, SlackMessageState> {
  constructor(props: SlackMessageProps) {
    super(props);
    this.state = { status: SlackMessageStatus.IDLE };
  }

  sendInvite = () => {
    this.setState({ status: SlackMessageStatus.SUBMITTING });
    Meteor.call('slackInvite', (err?: Error) => {
      if (err) {
        this.setState({ status: SlackMessageStatus.ERROR, errorMessage: err.message });
      } else {
        this.setState({ status: SlackMessageStatus.SUCCESS });
      }
    });
  };

  reset = () => {
    this.setState({ status: SlackMessageStatus.IDLE });
  };

  render() {
    let msg;
    // eslint-disable-next-line default-case
    switch (this.state.status) {
      case SlackMessageStatus.IDLE:
        msg = 'It looks like there\'s no Slack username in your profile. If you need an invite ' +
              'to Slack, we can do that! Otherwise, adding it to your profile helps us get in ' +
              'touch.';
        break;
      case SlackMessageStatus.SUBMITTING:
        msg = 'Sending an invite now...';
        break;
      case SlackMessageStatus.SUCCESS:
        msg = 'Done! Check your email. This notification will stick around to remind you to ' +
              'finish signing up.';
        break;
      case SlackMessageStatus.ERROR:
        msg = `Uh-oh - something went wrong: ${this.state.errorMessage}`;
        break;
    }

    const actions = [];
    if (this.state.status === 'idle') {
      actions.push(<li key="invite"><button type="button" onClick={this.sendInvite}>Send me an invite</button></li>);
    }

    actions.push(<li key="edit"><Link to="/users/me">Edit my profile</Link></li>);

    if (this.state.status === 'success' || this.state.status === 'error') {
      actions.push(<li key="reset"><button type="button" onClick={this.reset}>Ok</button></li>);
    }

    return (
      <li>
        <MessengerSpinner />
        <MessengerContent>
          {msg}
          <ul className="actions">
            {actions}
          </ul>
        </MessengerContent>
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
          <div dangerouslySetInnerHTML={{ __html: marked(DOMPurify.sanitize(this.props.announcement.message)) }} />
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

type NotificationCenterProps = {
  ready: boolean;
  announcements?: NotificationCenterAnnouncement[];
  guesses?: NotificationCenterGuess[];
  slackConfigured?: boolean;
}

interface NotificationCenterState {
  hideSlackSetupMessage: boolean;
  dismissedGuesses: Record<string, boolean>;
}

class NotificationCenter extends React.Component<NotificationCenterProps, NotificationCenterState> {
  constructor(props: NotificationCenterProps) {
    super(props);
    this.state = {
      hideSlackSetupMessage: false,
      dismissedGuesses: {},
    };
  }

  hideSlackSetupMessage = () => {
    this.setState({
      hideSlackSetupMessage: true,
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

  render() {
    if (!this.props.ready || !this.props.guesses || !this.props.announcements) {
      return <div />;
    }

    // Build a list of uninstantiated messages with their props, then create them
    const messages = [];

    if (!this.props.slackConfigured && !this.state.hideSlackSetupMessage) {
      messages.push(<SlackMessage key="slack" onDismiss={this.hideSlackSetupMessage} />);
    }

    _.forEach(this.props.guesses, (g) => {
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

    _.forEach(this.props.announcements, (a) => {
      messages.push(
        <AnnouncementMessage
          key={a.pa._id}
          id={a.pa._id}
          announcement={a.announcement}
          createdByDisplayName={a.createdByDisplayName}
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
  let guessesHandle = { ready: () => true };
  let puzzlesHandle = { ready: () => true };
  let huntsHandle = { ready: () => true };
  if (canUpdateGuesses) {
    guessesHandle = Meteor.subscribe('mongo.guesses', { state: 'pending' });
    puzzlesHandle = Meteor.subscribe('mongo.puzzles');
    huntsHandle = Meteor.subscribe('mongo.hunts');
  }

  // This is overly broad, but we likely already have the data cached locally
  const selfHandle = Meteor.subscribe('mongo.profiles', { _id: Meteor.userId() });
  const displayNamesHandle = Profiles.subscribeDisplayNames();
  const announcementsHandle = Meteor.subscribe('mongo.announcements');

  const query = {
    user: Meteor.userId()!,
  };
  const paHandle = Meteor.subscribe('mongo.pending_announcements', query);

  // Don't even try to put things together until we have the announcements loaded
  if (!selfHandle.ready() || !displayNamesHandle.ready() || !announcementsHandle.ready()) {
    return { ready: false };
  }

  const profile = Profiles.findOne(Meteor.userId()!);

  const data = {
    ready: guessesHandle.ready() && puzzlesHandle.ready() && huntsHandle.ready() && paHandle.ready(),
    announcements: [] as NotificationCenterAnnouncement[],
    guesses: [] as NotificationCenterGuess[],
    slackConfigured: !!(profile && profile.slackHandle),
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

  return data;
})(NotificationCenter);

export default NotificationCenterContainer;
