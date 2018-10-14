import { Meteor } from 'meteor/meteor';
import moment from 'moment';
import React from 'react';
import BS from 'react-bootstrap';
import marked from 'marked';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { navAggregatorType } from '/imports/client/components/NavAggregator.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';

/* eslint-disable max-len */

const AnnouncementForm = React.createClass({
  propTypes: {
    huntId: React.PropTypes.string.isRequired,
  },

  getInitialState() {
    return {
      message: '',
      submitState: 'idle',
      errorMessage: '',
    };
  },

  setMessage(event) {
    this.setState({
      message: event.target.value,
    });
  },

  postAnnouncement() {
    if (this.state.message) {
      this.setState({
        submitState: 'submitting',
      });
      Meteor.call('postAnnouncement', this.props.huntId, this.state.message, (error) => {
        if (error) {
          this.setState({
            submitState: 'failed',
            errorMessage: error.message,
          });
        } else {
          this.setState({
            message: '',
            submitState: 'idle',
          });
        }
      });
    }
  },

  render() {
    return (
      <div className="announcement-form">
        <h3>Write an announcement:</h3>
        {this.state.submitState === 'failed' ? <BS.Alert bsStyle="danger">{this.state.errorMessage}</BS.Alert> : null}
        <textarea
          value={this.state.message}
          onChange={this.setMessage}
          disabled={this.state.submitState === 'submitting'}
        />
        <div>Try to keep it brief and on-point.</div>
        <div className="button-row">
          <BS.Button
            bsStyle="primary"
            onClick={this.postAnnouncement}
            disabled={this.state.submitState === 'submitting'}
          >
            Send
          </BS.Button>
        </div>
      </div>
    );
  },
});

const Announcement = React.createClass({
  propTypes: {
    announcement: React.PropTypes.shape(Schemas.Announcements.asReactPropTypes()).isRequired,
    displayNames: React.PropTypes.objectOf(React.PropTypes.string.isRequired).isRequired,
  },

  render() {
    const ann = this.props.announcement;

    // TODO: All the styles here could stand to be improved, but this gets it on the screen in a
    // minimally-offensive manner, and preserves the intent of newlines.
    return (
      <div className="announcement">
        <div className="announcement-origin">
          <div className="announcement-timestamp">{moment(ann.createdAt).calendar()}</div>
          <div>{this.props.displayNames[ann.createdBy]}</div>
        </div>
        <div dangerouslySetInnerHTML={{ __html: marked(ann.message, { sanitize: true }) }} />
      </div>
    );
  },
});

const AnnouncementsPage = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    // We already have subscribed to mongo.announcements on the main page, since we want to be able
    // to show them on any page.  So we don't *need* to make the subscription here...
    // ...except that we might want to wait to render until we've received all of them?  IDK.
    const announcementsHandle = this.context.subs.subscribe('mongo.announcements', { hunt: this.props.params.huntId });
    const displayNamesHandle = Models.Profiles.subscribeDisplayNames(this.context.subs);
    const ready = announcementsHandle.ready() && displayNamesHandle.ready();

    let announcements;
    let displayNames;
    if (!ready) {
      announcements = [];
      displayNames = {};
    } else {
      announcements = Models.Announcements.find({ hunt: this.props.params.huntId }, { sort: { createdAt: 1 } }).fetch();
      displayNames = Models.Profiles.displayNames();
    }
    const canCreateAnnouncements = Roles.userHasPermission(Meteor.userId(), 'mongo.announcements.insert');

    return {
      ready,
      announcements,
      canCreateAnnouncements,
      displayNames,
    };
  },

  renderPage() {
    if (!this.data.ready) {
      return <div>loading...</div>;
    }

    return (
      <div>
        <h1>Announcements</h1>
        {this.data.canCreateAnnouncements && <AnnouncementForm huntId={this.props.params.huntId} />}
        {/* ostensibly these should be ul and li, but then I have to deal with overriding
            block/inline and default margins and list style type and meh */}
        <div>
          {this.data.announcements.map((announcement) => {
            return (
              <Announcement
                key={announcement._id}
                announcement={announcement}
                displayNames={this.data.displayNames}
              />
            );
          })}
        </div>
      </div>
    );
  },

  render() {
    return (
      <this.context.navAggregator.NavItem
        itemKey="announcements"
        to={`/hunts/${this.props.params.huntId}/announcements`}
        label="Announcements"
      >
        {this.renderPage()}
      </this.context.navAggregator.NavItem>
    );
  },
});

export default AnnouncementsPage;
