const {PureRenderMixin} = React.addons;
const {Link} = ReactRouter;

const MessengerDismissButton = React.createClass({
  mixins: [PureRenderMixin],
  propTypes: {
    onDismiss: React.PropTypes.func.isRequired,
  },

  render() {
    return <button type="button" className="messenger-close" onClick={this.props.onDismiss}>×</button>;
  },
});

const MessengerContent = React.createClass({
  mixins: [PureRenderMixin],
  render() {
    return <div className="messenger-message-inner">{this.props.children}</div>;
  },
});

const MessengerSpinner = React.createClass({
  mixins: [PureRenderMixin],
  render() {
    return (
      <div className="messenger-spinner">
        <span className="messenger-spinner-side messenger-spinner-side-left">
          <span className="messenger-spinner-fill"></span>
        </span>
        <span className="messenger-spinner-side messenger-spinner-side-right">
          <span className="messenger-spinner-fill"></span>
        </span>
      </div>
    );
  },
});

const MessageMixin = {
  propTypes: {
    oldest: React.PropTypes.bool.isRequired,
    newest: React.PropTypes.bool.isRequired,
  },

  messageClasses(type) {
    return `messenger-message message alert ${type} message-${type} alert-${type}`;
  },

  slotClasses() {
    return classnames(
      'messenger-message-slot messenger-shown',
      this.props.newest && 'messenger-last',
      this.props.oldest && 'messenger-first');
  },
};

const GuessMessage = React.createClass({
  propTypes: {
    guess: React.PropTypes.shape(Schemas.Guesses.asReactPropTypes()).isRequired,
    puzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
  },

  mixins: [PureRenderMixin, MessageMixin],

  focusGuess() {
    this.refs.guess.select();
  },

  markCorrect() {
    Meteor.call('markGuessCorrect', this.props.guess._id);
  },

  markIncorrect() {
    Meteor.call('markGuessIncorrect', this.props.guess._id);
  },

  markRejected() {
    Meteor.call('markGuessRejected', this.props.guess._id);
  },

  render() {
    return (
      <li className={this.slotClasses()} onClick={this.focusGuess}>
        <div className={this.messageClasses('info')}>
          <MessengerContent>
            Guess for <a href={this.props.puzzle.url} target="_blank">{this.props.puzzle.title}</a>:
            {' '}
            <input ref="guess"
                   type="text"
                   readonly
                   size={this.props.guess.guess.length}
                   style={{background: 'transparent', outline: 'none', border: 0, padding: 0}}
                   value={this.props.guess.guess}/>
          </MessengerContent>
          <div className="messenger-actions">
            <a onClick={this.markCorrect}>Correct</a>
            <a onClick={this.markIncorrect}>Incorrect</a>
            <a onClick={this.markRejected}>Reject</a>
          </div>
          <MessengerSpinner/>
        </div>
      </li>
    );
  },
});

const SlackMessage = React.createClass({
  mixins: [PureRenderMixin, MessageMixin],

  getInitialState() {
    return {status: 'idle', errorMessage: null};
  },

  sendInvite() {
    this.setState({status: 'submitting'});
    Meteor.call('slackInvite', (err) => {
      if (err) {
        this.setState({status: 'error', errorMessage: err.message});
      } else {
        this.setState({status: 'success'});
      }
    });
  },

  reset() {
    this.setState({status: 'idle', errorMessage: null});
  },

  render() {
    let msg;
    let type;
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
    };

    const actions = [];
    if (this.state.status === 'idle') {
      actions.push(<a onClick={this.sendInvite}>Send me an invite</a>);
    }

    actions.push(<Link to="/users/me">Edit my profile</Link>);

    if (this.state.status === 'success' || this.state.status === 'error') {
      actions.push(<a onClick={this.reset}>Ok</a>);
    }

    return (
      <li className={this.slotClasses()}>
        <div className={classnames(this.messageClasses(type), this.state.status === 'submitting' && 'messenger-retry-soon')}>
          <MessengerContent>
            {msg}
          </MessengerContent>
          <div className="messenger-actions">
            {actions}
          </div>
          <MessengerSpinner/>
        </div>
      </li>
    );
  },
});

const AnnouncementMessage = React.createClass({
  mixins: [PureRenderMixin, MessageMixin],

  propTypes: {
    id: React.PropTypes.string.isRequired,
    announcement: React.PropTypes.shape(Schemas.Announcements.asReactPropTypes()).isRequired,
    createdBy: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()).isRequired,
  },

  onDismiss() {
    Models.PendingAnnouncements.remove(this.props.id);
  },

  render() {
    return (
      <li className={this.slotClasses()}>
        <div className={this.messageClasses('info')}>
          <MessengerDismissButton onDismiss={this.onDismiss}/>
          <MessengerContent>
            <div dangerouslySetInnerHTML={{__html: marked(this.props.announcement.message, {sanitize: true})}}/>
            <footer>- {this.props.createdBy.displayName}, {moment(this.props.announcement.createdAt).calendar()}</footer>
          </MessengerContent>
          <MessengerSpinner/>
        </div>
      </li>
    );
  },
});

NotificationCenter = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  getMeteorData() {
    const operator = Roles.userHasRole(Meteor.userId(), 'admin');

    const user = Meteor.user();
    let operating = user && user.profile && user.profile.operating;
    if (operating === undefined) {
      operating = true;
    }

    // Yes this is hideous, but it just makes the logic easier
    let guessesHandle = {ready: () => true};
    let puzzlesHandle = {ready: () => true};
    if (Roles.userHasRole(Meteor.userId(), 'admin') && operating) {
      guessesHandle = this.context.subs.subscribe('mongo.guesses', {state: 'pending'});
      puzzlesHandle = this.context.subs.subscribe('mongo.puzzles');
    }

    // This is overly broad, but we likely already have the data cached locally
    const profilesHandle = this.context.subs.subscribe('mongo.profiles');
    const announcementsHandle = this.context.subs.subscribe('mongo.announcements');

    const query = {
      user: Meteor.userId(),
    };
    const paHandle = this.context.subs.subscribe('mongo.pending_announcements', query);

    // Don't even try to put things together until we have the announcements loaded
    if (!profilesHandle.ready() || !announcementsHandle.ready()) {
      return {ready: false};
    }

    const data = {
      ready: guessesHandle.ready() && puzzlesHandle.ready() && paHandle.ready(),
      announcements: [],
      guesses: [],
    };

    if (operator && operating) {
      Models.Guesses.find({state: 'pending'}, {sort: {createdAt: -1}}).forEach((guess) => {
        data.guesses.push({
          guess,
          puzzle: Models.Puzzles.findOne(guess.puzzle),
        });
      });
    }

    Models.PendingAnnouncements.find(query, {sort: {createdAt: -1}}).forEach((pa) => {
      const announcement = Models.Announcements.findOne(pa.announcement);
      data.announcements.push({
        pa,
        announcement,
        createdBy: Models.Profiles.findOne(announcement.createdBy),
      });
    });

    return data;
  },

  render() {
    if (!this.data.ready) {
      return <div/>;
    }

    // Build a list of uninstantiated messages with their props, then create them
    const messages = [];
    let i = 0;

    const profile = Models.Profiles.findOne(Meteor.userId());
    if (!profile || !profile.slackHandle) {
      messages.push([SlackMessage, {key: 'slack'}]);
    }

    _.forEach(this.data.guesses, (g) => {
      messages.push([GuessMessage, _.extend({key: g.guess._id}, g)]);
    });

    _.forEach(this.data.announcements, (a) => {
      messages.push([
        AnnouncementMessage, {
          key: a.pa._id,
          id: a.pa._id,
          announcement: a.announcement,
          createdBy: a.createdBy,
        },
      ]);
    });

    const instantiated = _.map(messages, ([kls, props], idx) => {
      return React.createElement(kls, _.extend({
        newest: idx === 0,
        oldest: idx === messages.length - 1,
      }, props));
    });

    return (
      <ul className="messenger messenger-fixed messenger-on-top messenger-on-right messenger-theme-flat">
        {instantiated}
      </ul>
    );
  },
});
