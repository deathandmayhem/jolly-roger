import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import BS from 'react-bootstrap';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import { Link } from 'react-router';
import moment from 'moment';
import marked from 'marked';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import classnames from 'classnames';
import CopyToClipboard from 'react-copy-to-clipboard';
import JRPropTypes from '../JRPropTypes.js';

/* eslint-disable max-len */

const MessengerDismissButton = React.createClass({
  propTypes: {
    onDismiss: PropTypes.func.isRequired,
  },

  mixins: [PureRenderMixin],

  render() {
    return <button type="button" className="dismiss" onClick={this.props.onDismiss}>×</button>;
  },
});

const MessengerContent = React.createClass({
  propTypes: {
    dismissable: PropTypes.bool,
    children: PropTypes.node,
  },

  mixins: [PureRenderMixin],

  render() {
    const { dismissable, children } = this.props;
    const classes = classnames('content', { dismissable });
    return <div className={classes}>{children}</div>;
  },
});

const MessengerSpinner = React.createClass({
  mixins: [PureRenderMixin],
  render() {
    return (
      <div className="spinner-box">
        <div className="spinner" />
      </div>
    );
  },
});

const GuessMessage = React.createClass({
  propTypes: {
    guess: PropTypes.shape(Schemas.Guesses.asReactPropTypes()).isRequired,
    puzzle: PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    guesser: PropTypes.string.isRequired,
    onDismiss: PropTypes.func.isRequired,
  },

  mixins: [PureRenderMixin],

  markCorrect() {
    Meteor.call('markGuessCorrect', this.props.guess._id);
  },

  markIncorrect() {
    Meteor.call('markGuessIncorrect', this.props.guess._id);
  },

  markRejected() {
    Meteor.call('markGuessRejected', this.props.guess._id);
  },

  dismissGuess() {
    this.props.onDismiss(this.props.guess._id);
  },

  render() {
    const directionTooltip = (
      <BS.Tooltip id="direction-tooltip">
        Direction this puzzle was solved, ranging from completely backsolved (-10) to completely forward solved (10)
      </BS.Tooltip>
    );

    const confidenceTooltip = (
      <BS.Tooltip id="confidence-tooltip">
        Submitter-estimated likelihood that this answer is correct
      </BS.Tooltip>
    );

    return (
      <li>
        <MessengerSpinner />
        <MessengerContent dismissable>
          <div>
            Guess for <a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer">{this.props.puzzle.title}</a> from {this.props.guesser}:
            {' '}
            {this.props.guess.guess}
          </div>
          <div>
            <BS.OverlayTrigger placement="bottom" overlay={directionTooltip}>
              <span>
                Solve direction: {this.props.guess.direction}
              </span>
            </BS.OverlayTrigger>
          </div>
          <div>
            <BS.OverlayTrigger placement="bottom" overlay={confidenceTooltip}>
              <span>
                Confidence: {this.props.guess.confidence}%
              </span>
            </BS.OverlayTrigger>
          </div>
          <ul className="actions">
            <li>
              <CopyToClipboard text={this.props.guess.guess}>
                <button><BS.Glyphicon glyph="copy" /></button>
              </CopyToClipboard>
            </li>
            <li><button onClick={this.markCorrect}>Correct</button></li>
            <li><button onClick={this.markIncorrect}>Incorrect</button></li>
            <li><button onClick={this.markRejected}>Reject</button></li>
          </ul>
        </MessengerContent>
        <MessengerDismissButton onDismiss={this.dismissGuess} />
      </li>
    );
  },
});

const SlackMessage = React.createClass({
  propTypes: {
    onDismiss: PropTypes.func.isRequired,
  },

  mixins: [PureRenderMixin],

  getInitialState() {
    return { status: 'idle', errorMessage: null };
  },

  sendInvite() {
    this.setState({ status: 'submitting' });
    Meteor.call('slackInvite', (err) => {
      if (err) {
        this.setState({ status: 'error', errorMessage: err.message });
      } else {
        this.setState({ status: 'success' });
      }
    });
  },

  reset() {
    this.setState({ status: 'idle', errorMessage: null });
  },

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
      actions.push(<li key="invite"><button onClick={this.sendInvite}>Send me an invite</button></li>);
    }

    actions.push(<li key="edit"><Link to="/users/me">Edit my profile</Link></li>);

    if (this.state.status === 'success' || this.state.status === 'error') {
      actions.push(<li key="reset"><button onClick={this.reset}>Ok</button></li>);
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
  },
});

const AnnouncementMessage = React.createClass({
  propTypes: {
    id: PropTypes.string.isRequired,
    announcement: PropTypes.shape(Schemas.Announcements.asReactPropTypes()).isRequired,
    createdByDisplayName: PropTypes.string.isRequired,
  },

  mixins: [PureRenderMixin],

  onDismiss() {
    Models.PendingAnnouncements.remove(this.props.id);
  },

  render() {
    return (
      <li>
        <MessengerSpinner />
        <MessengerContent dismissable>
          <div dangerouslySetInnerHTML={{ __html: marked(this.props.announcement.message, { sanitize: true }) }} />
          <footer>- {this.props.createdByDisplayName}, {moment(this.props.announcement.createdAt).calendar()}</footer>
        </MessengerContent>
        <MessengerDismissButton onDismiss={this.onDismiss} />
      </li>
    );
  },
});

const NotificationCenter = React.createClass({
  contextTypes: {
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getInitialState() {
    return {
      hideSlackSetupMessage: false,
      dismissedGuesses: {},
    };
  },

  getMeteorData() {
    const canUpdateGuesses = Roles.userHasPermission(Meteor.userId(), 'mongo.guesses.update');

    // Yes this is hideous, but it just makes the logic easier
    let guessesHandle = { ready: () => true };
    let puzzlesHandle = { ready: () => true };
    if (canUpdateGuesses) {
      guessesHandle = this.context.subs.subscribe('mongo.guesses', { state: 'pending' });
      puzzlesHandle = this.context.subs.subscribe('mongo.puzzles');
    }

    // This is overly broad, but we likely already have the data cached locally
    const selfHandle = this.context.subs.subscribe('mongo.profiles', { _id: Meteor.userId() });
    const displayNamesHandle = this.context.subs.subscribe(
      'mongo.profiles',
      {},
      { fields: { displayName: 1 } }
    );
    const announcementsHandle = this.context.subs.subscribe('mongo.announcements');

    const query = {
      user: Meteor.userId(),
    };
    const paHandle = this.context.subs.subscribe('mongo.pending_announcements', query);

    // Don't even try to put things together until we have the announcements loaded
    if (!selfHandle.ready() || !displayNamesHandle.ready() || !announcementsHandle.ready()) {
      return { ready: false };
    }

    const profile = Models.Profiles.findOne(Meteor.userId());

    const data = {
      ready: guessesHandle.ready() && puzzlesHandle.ready() && paHandle.ready(),
      announcements: [],
      guesses: [],
      slackConfigured: profile && profile.slackHandle,
    };

    if (canUpdateGuesses) {
      Models.Guesses.find({ state: 'pending' }, { sort: { createdAt: 1 } }).forEach((guess) => {
        data.guesses.push({
          guess,
          puzzle: Models.Puzzles.findOne(guess.puzzle),
          guesser: Models.Profiles.findOne(guess.createdBy).displayName,
        });
      });
    }

    Models.PendingAnnouncements.find(query, { sort: { createdAt: 1 } }).forEach((pa) => {
      const announcement = Models.Announcements.findOne(pa.announcement);
      data.announcements.push({
        pa,
        announcement,
        createdByDisplayName: Models.Profiles.findOne(announcement.createdBy).displayName,
      });
    });

    return data;
  },

  hideSlackSetupMessage() {
    this.setState({
      hideSlackSetupMessage: true,
    });
  },

  dismissGuess(guessId) {
    const newState = {};
    newState[guessId] = true;
    _.extend(newState, this.state.dismissedGuesses);
    this.setState({
      dismissedGuesses: newState,
    });
  },

  render() {
    if (!this.data.ready) {
      return <div />;
    }

    // Build a list of uninstantiated messages with their props, then create them
    const messages = [];

    if (!this.data.slackConfigured && !this.state.hideSlackSetupMessage) {
      messages.push(<SlackMessage key="slack" onDismiss={this.hideSlackSetupMessage} />);
    }

    _.forEach(this.data.guesses, (g) => {
      if (this.state.dismissedGuesses[g.guess._id]) return;
      messages.push(<GuessMessage
        key={g.guess._id}
        guess={g.guess}
        puzzle={g.puzzle}
        guesser={g.guesser}
        onDismiss={this.dismissGuess}
      />);
    });

    _.forEach(this.data.announcements, (a) => {
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
  },
});

export default NotificationCenter;
