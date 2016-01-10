HuntAnnouncements = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  propTypes: {
    huntId: React.PropTypes.string.isRequired,
  },

  getInitialState() {
    return {
      messenger: Messenger({
        extraClasses: 'messenger-fixed messenger-on-top messenger-on-right',
        theme: 'flat',
        maxMessages: 1000,
      }),
      announcements: {},
    };
  },

  getMeteorData() {
    const handle = this.context.subs.subscribe('mongo.announcements', {hunt: this.props.huntId});
    if (!handle.ready()) {
      // Don't start trying to render anything until we can actually
      // find the announcement text.
      return {};
    }

    const query = {
      hunt: this.props.huntId,
      user: Meteor.userId(),
    };
    this.context.subs.subscribe('mongo.pending_announcements', query);
    const cursor = Models.PendingAnnouncements.find(query, {sort: {createdAt: -1}});
    cursor.observe({
      added: (pa) => {
        this.state.announcements[pa._id] = this.state.messenger.post({
          id: pa._id,
          hideAfter: null,
          message: Models.Announcements.findOne(pa.announcement).message,
          showCloseButton: true,
          events: {
            'click .messenger-close': function() {
              pa.destroy();
            },
          },
        });
      },

      removed: (pa) => {
        const msg = this.state.announcements[pa._id];
        if (msg) {
          msg.hide();
        }
      },
    });
    return {};
  },

  componentWillUnmount() {
    this.state.messenger.hideAll();
  },

  render() {
    return <div/>;
  },
});
