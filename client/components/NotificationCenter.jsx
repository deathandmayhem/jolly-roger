const {PureRenderMixin} = React.addons;

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

const MessengerMessage = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    oldest: React.PropTypes.bool.isRequired,
    newest: React.PropTypes.bool.isRequired,
  },

  render() {
    classes = classnames(
      'messenger-message-slot messenger-shown',
      this.props.newest && 'messenger-last',
      this.props.oldest && 'messenger-first');
    return (
      <li className={classes}>
        <div className="messenger-message message alert info message-info alert-info">
          {this.props.children}
          <div className="messenger-spinner">
            <span className="messenger-spinner-side messenger-spinner-side-left">
              <span className="messenger-spinner-fill"></span>
            </span>
            <span className="messenger-spinner-side messenger-spinner-side-right">
              <span className="messenger-spinner-fill"></span>
            </span>
          </div>
        </div>
      </li>
    );
  },
});

const Announcement = React.createClass({
  mixins: [PureRenderMixin],

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
      <div>
        <MessengerDismissButton onDismiss={this.onDismiss}/>
        <MessengerContent>
          <div dangerouslySetInnerHTML={{__html: marked(this.props.announcement.message, {sanitize: true})}}/>
          <footer>- {this.props.createdBy.displayName}, {moment(this.props.announcement.createdAt).calendar()}</footer>
        </MessengerContent>
      </div>
    );
  },
});

NotificationCenter = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  getMeteorData() {
    // This is overly broad, but we likely already have the data cached locally
    const profilesHandle = this.context.subs.subscribe('mongo.profiles');
    const announcementsHandle = this.context.subs.subscribe('mongo.announcements');
    if (!profilesHandle.ready() || !announcementsHandle.ready()) {
      // Don't start trying to render anything until we can actually
      // find the announcement text.
      return {ready: false};
    }

    const query = {
      user: Meteor.userId(),
    };
    const paHandle = this.context.subs.subscribe('mongo.pending_announcements', query);
    if (!paHandle.ready()) {
      return {ready: false};
    }

    const data = {
      ready: true,
      announcements: [],
    };

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

    const announcements = _.map(this.data.announcements, (a, idx) => {
      return (
        <Announcement
                key={a.pa._id}
                id={a.pa._id}
                announcement={a.announcement}
                createdBy={a.createdBy}/>
      );
    });

    const messages = _.map(announcements, (m, idx) => {
      return (
        <MessengerMessage
                key={m.props.id}
                newest={idx === 0}
                oldest={idx === this.data.announcements.length - 1}>
          {m}
        </MessengerMessage>
      );
    });

    return (
      <ul className="messenger messenger-fixed messenger-on-top messenger-on-right messenger-theme-flat">
        {messages}
      </ul>
    );
  },
});
