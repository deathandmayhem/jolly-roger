import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import Glyphicon from 'react-bootstrap/lib/Glyphicon';
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import Tooltip from 'react-bootstrap/lib/Tooltip';
import { Link } from 'react-router';
import moment from 'moment';
import marked from 'marked';
import { withTracker } from 'meteor/react-meteor-data';
import classnames from 'classnames';
import CopyToClipboard from 'react-copy-to-clipboard';
import subsCache from '../subsCache.js';
import AnnouncementsSchema from '../../lib/schemas/announcements.js';
import GuessesSchema from '../../lib/schemas/guess.js';
import PuzzlesSchema from '../../lib/schemas/puzzles.js';
import Announcements from '../../lib/models/announcements.js';
import Guesses from '../../lib/models/guess.js';
import PendingAnnouncements from '../../lib/models/pending_announcements.js';
import Profiles from '../../lib/models/profiles.js';
import Puzzles from '../../lib/models/puzzles.js';

/* eslint-disable max-len */

class MessengerDismissButton extends React.PureComponent {
  static propTypes = {
    onDismiss: PropTypes.func.isRequired,
  };

  render() {
    return <button type="button" className="dismiss" onClick={this.props.onDismiss}>×</button>;
  }
}

class MessengerContent extends React.PureComponent {
  static propTypes = {
    dismissable: PropTypes.bool,
    children: PropTypes.node,
  };

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

class GuessMessage extends React.PureComponent {
  static propTypes = {
    guess: PropTypes.shape(GuessesSchema.asReactPropTypes()).isRequired,
    puzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired,
    guesser: PropTypes.string.isRequired,
    onDismiss: PropTypes.func.isRequired,
  };

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
            <a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer">{this.props.puzzle.title}</a>
            from
            {this.props.guesser}
            :
            {' '}
            {this.props.guess.guess}
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
                <button type="button"><Glyphicon glyph="copy" /></button>
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

class SlackMessage extends React.PureComponent {
  static propTypes = {
    onDismiss: PropTypes.func.isRequired,
  };

  state = { status: 'idle', errorMessage: null };

  sendInvite = () => {
    this.setState({ status: 'submitting' });
    Meteor.call('slackInvite', (err) => {
      if (err) {
        this.setState({ status: 'error', errorMessage: err.message });
      } else {
        this.setState({ status: 'success' });
      }
    });
  };

  reset = () => {
    this.setState({ status: 'idle', errorMessage: null });
  };

  render() {
    let msg;
    // TODO: do something with type
    let type; // eslint-disable-line no-unused-vars
    // eslint-disable-next-line default-case
    switch (this.state.status) {
      case 'idle':
        msg = 'It looks like there\'s no Slack username in your profile. If you need an invite ' +
              'to Slack, we can do that! Otherwise, adding it to your profile helps us get in ' +
              'touch.';
        type = 'info';
        break;
      case 'submitting':
        msg = 'Sending an invite now...';
        type = 'error';
        break;
      case 'success':
        msg = 'Done! Check your email. This notification will stick around to remind you to ' +
              'finish signing up.';
        type = 'success';
        break;
      case 'error':
        msg = `Uh-oh - something went wrong: ${this.state.errorMessage}`;
        type = 'error';
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

class AnnouncementMessage extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string.isRequired,
    announcement: PropTypes.shape(AnnouncementsSchema.asReactPropTypes()).isRequired,
    createdByDisplayName: PropTypes.string.isRequired,
  };

  onDismiss = () => {
    PendingAnnouncements.remove(this.props.id);
  };

  render() {
    return (
      <li>
        <MessengerSpinner />
        <MessengerContent dismissable>
          <div dangerouslySetInnerHTML={{ __html: marked(this.props.announcement.message, { sanitize: true }) }} />
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

class NotificationCenter extends React.Component {
  static propTypes = {
    ready: PropTypes.bool.isRequired,
    announcements: PropTypes.arrayOf(PropTypes.shape(AnnouncementsSchema.asReactPropTypes())),
    guesses: PropTypes.arrayOf(PropTypes.shape({
      guess: PropTypes.shape(GuessesSchema.asReactPropTypes()),
      puzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()),
      guesser: PropTypes.string,
    })),
    slackConfigured: PropTypes.bool,
  };

  state = {
    hideSlackSetupMessage: false,
    dismissedGuesses: {},
  };

  hideSlackSetupMessage = () => {
    this.setState({
      hideSlackSetupMessage: true,
    });
  };

  dismissGuess = (guessId) => {
    const newState = {};
    newState[guessId] = true;
    _.extend(newState, this.state.dismissedGuesses);
    this.setState({
      dismissedGuesses: newState,
    });
  };

  render() {
    if (!this.props.ready) {
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

export default withTracker(() => {
  const canUpdateGuesses = Roles.userHasPermission(Meteor.userId(), 'mongo.guesses.update');

  // Yes this is hideous, but it just makes the logic easier
  let guessesHandle = { ready: () => true };
  let puzzlesHandle = { ready: () => true };
  if (canUpdateGuesses) {
    guessesHandle = subsCache.subscribe('mongo.guesses', { state: 'pending' });
    puzzlesHandle = subsCache.subscribe('mongo.puzzles');
  }

  // This is overly broad, but we likely already have the data cached locally
  const selfHandle = subsCache.subscribe('mongo.profiles', { _id: Meteor.userId() });
  const displayNamesHandle = subsCache.subscribe(
    'mongo.profiles',
    {},
    { fields: { displayName: 1 } }
  );
  const announcementsHandle = subsCache.subscribe('mongo.announcements');

  const query = {
    user: Meteor.userId(),
  };
  const paHandle = subsCache.subscribe('mongo.pending_announcements', query);

  // Don't even try to put things together until we have the announcements loaded
  if (!selfHandle.ready() || !displayNamesHandle.ready() || !announcementsHandle.ready()) {
    return { ready: false };
  }

  const profile = Profiles.findOne(Meteor.userId());

  const data = {
    ready: guessesHandle.ready() && puzzlesHandle.ready() && paHandle.ready(),
    announcements: [],
    guesses: [],
    slackConfigured: !!(profile && profile.slackHandle),
  };

  if (canUpdateGuesses) {
    Guesses.find({ state: 'pending' }, { sort: { createdAt: 1 } }).forEach((guess) => {
      data.guesses.push({
        guess,
        puzzle: Puzzles.findOne(guess.puzzle),
        guesser: Profiles.findOne(guess.createdBy).displayName,
      });
    });
  }

  PendingAnnouncements.find(query, { sort: { createdAt: 1 } }).forEach((pa) => {
    const announcement = Announcements.findOne(pa.announcement);
    data.announcements.push({
      pa,
      announcement,
      createdByDisplayName: Profiles.findOne(announcement.createdBy).displayName,
    });
  });

  return data;
})(NotificationCenter);
