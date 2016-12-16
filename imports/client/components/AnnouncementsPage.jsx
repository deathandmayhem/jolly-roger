import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import moment from 'moment';
import React from 'react';
import BS from 'react-bootstrap';
import marked from 'marked';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
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

  async postAnnouncement() {
    if (!this.state.message) {
      return;
    }

    this.setState({ submitState: 'submitting' });
    const error = await Meteor.callPromise('postAnnouncement', this.props.huntId, this.state.message);
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
  },

  render() {
    return (
      <div style={{ backgroundColor: '#f0f0f0', padding: '16px' }}>
        <h3 style={{ marginTop: '0px' }}>Write an announcement:</h3>
        <textarea
          value={this.state.message}
          onChange={this.setMessage}
          style={{ width: '100%' }}
          disabled={this.state.submitState === 'submitting'}
        />
        <div>Try to keep it brief and on-point.</div>
        <div style={{ textAlign: 'right' }}>
          <BS.Button
            bsStyle="primary"
            onClick={this.postAnnouncement}
            disabled={this.state.submitState === 'submitting'}
          >
            Send
          </BS.Button>
        </div>
        {this.state.submitState === 'failed' ? <BS.Alert bsStyle="danger">{this.state.errorMessage}</BS.Alert> : null}
      </div>
    );
  },
});

const Announcement = React.createClass({
  propTypes: {
    announcement: React.PropTypes.shape(Schemas.Announcements.asReactPropTypes()).isRequired,
    indexedProfiles: React.PropTypes.objectOf(
      React.PropTypes.shape(
        Schemas.Profiles.asReactPropTypes()
      ).isRequired
    ).isRequired,
  },

  render() {
    const ann = this.props.announcement;

    // TODO: All the styles here could stand to be improved, but this gets it on the screen in a
    // minimally-offensive manner, and preserves the intent of newlines.
    return (
      <div className="announcement" style={{ marginTop: '8px', marginBottom: '8px', padding: '8px', backgroundColor: '#eeeeee' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ textAlign: 'right' }}>{moment(ann.createdAt).calendar()}</div>
          <div>{this.props.indexedProfiles[ann.createdBy].displayName}</div>
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
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    // We already have subscribed to mongo.announcements on the main page, since we want to be able
    // to show them on any page.  So we don't *need* to make the subscription here...
    // ...except that we might want to wait to render until we've received all of them?  IDK.
    const announcementsHandle = this.context.subs.subscribe('mongo.announcements', { hunt: this.props.params.huntId });
    const profilesHandle = this.context.subs.subscribe('mongo.profiles');
    const ready = announcementsHandle.ready() && profilesHandle.ready();
    const announcements = ready ? Models.Announcements.find({ hunt: this.props.params.huntId }, { sort: { createdAt: 1 } }).fetch() : [];
    const canCreateAnnouncements = Roles.userHasPermission(Meteor.userId(), 'mongo.announcements.insert');
    const profiles = ready ? _.indexBy(Models.Profiles.find().fetch(), '_id') : [];
    return {
      ready,
      announcements,
      canCreateAnnouncements,
      profiles,
    };
  },

  render() {
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
                indexedProfiles={this.data.profiles}
              />
            );
          })}
        </div>
      </div>
    );
  },
});

export { AnnouncementsPage };
