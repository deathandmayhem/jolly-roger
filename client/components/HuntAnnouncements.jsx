const Announcement = React.createClass({
  propTypes: {
    id: React.PropTypes.string,
    announcement: React.PropTypes.shape(Schemas.Announcements.asReactPropTypes()).isRequired,
    oldest: React.PropTypes.bool.isRequired,
    newest: React.PropTypes.bool.isRequired,
  },

  dismiss() {
    Models.PendingAnnouncements.remove(this.props.id);
  },

  render() {
    classes = classnames(
      'messenger-message-slot messenger-shown',
      this.props.newest && 'messenger-last',
      this.props.oldest && 'messenger-first');
    return (
      <li className={classes}>
        <div className="messenger-message message alert info message-info alert-info">
          <button type="button" className="messenger-close" onClick={this.dismiss}>×</button>
          <div className="messenger-message-inner">
            {this.props.announcement.message}
          </div>
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

HuntAnnouncements = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  propTypes: {
    huntId: React.PropTypes.string.isRequired,
  },

  getMeteorData() {
    const handle = this.context.subs.subscribe('mongo.announcements', {hunt: this.props.huntId});
    if (!handle.ready()) {
      // Don't start trying to render anything until we can actually
      // find the announcement text.
      return {ready: false};
    }

    const query = {
      hunt: this.props.huntId,
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
      data.announcements.push({pa, announcement: Models.Announcements.findOne(pa.announcement)});
    });

    return data;
  },

  render() {
    if (!this.data.ready) {
      return <div/>;
    }

    const announcements = _.map(this.data.announcements, (a, idx) => {
      return <Announcement
                 key={a.pa._id}
                 id={a.pa._id}
                 announcement={a.announcement}
                 newest={idx === 0}
                 oldest={idx === this.data.announcements.length - 1}/>;
    });

    return (
      <ul className="messenger messenger-fixed messenger-on-top messenger-on-right messenger-theme-flat">
        {announcements}
      </ul>
    );
  },
});
