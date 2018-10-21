import { Meteor } from 'meteor/meteor';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import marked from 'marked';
import { withTracker } from 'meteor/react-meteor-data';
import navAggregatorType from './navAggregatorType.jsx';
import subsCache from '../subsCache.js';

/* eslint-disable max-len */

const AnnouncementForm = React.createClass({
  propTypes: {
    huntId: PropTypes.string.isRequired,
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
        {this.state.submitState === 'failed' ? <Alert bsStyle="danger">{this.state.errorMessage}</Alert> : null}
        <textarea
          value={this.state.message}
          onChange={this.setMessage}
          disabled={this.state.submitState === 'submitting'}
        />
        <div>Try to keep it brief and on-point.</div>
        <div className="button-row">
          <Button
            bsStyle="primary"
            onClick={this.postAnnouncement}
            disabled={this.state.submitState === 'submitting'}
          >
            Send
          </Button>
        </div>
      </div>
    );
  },
});

const Announcement = React.createClass({
  propTypes: {
    announcement: PropTypes.shape(Schemas.Announcements.asReactPropTypes()).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
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
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    canCreateAnnouncements: PropTypes.bool.isRequired,
    announcements: PropTypes.arrayOf(PropTypes.shape(Schemas.Announcements.asReactPropTypes())).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string).isRequired,
  },

  contextTypes: {
    navAggregator: navAggregatorType,
  },

  renderPage() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    }

    return (
      <div>
        <h1>Announcements</h1>
        {this.props.canCreateAnnouncements && <AnnouncementForm huntId={this.props.params.huntId} />}
        {/* ostensibly these should be ul and li, but then I have to deal with overriding
            block/inline and default margins and list style type and meh */}
        <div>
          {this.props.announcements.map((announcement) => {
            return (
              <Announcement
                key={announcement._id}
                announcement={announcement}
                displayNames={this.props.displayNames}
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

const AnnouncementsPageContainer = withTracker(({ params }) => {
  // We already have subscribed to mongo.announcements on the main page, since we want to be able
  // to show them on any page.  So we don't *need* to make the subscription here...
  // ...except that we might want to wait to render until we've received all of them?  IDK.
  const announcementsHandle = subsCache.subscribe('mongo.announcements', { hunt: params.huntId });
  const displayNamesHandle = Models.Profiles.subscribeDisplayNames(subsCache);
  const ready = announcementsHandle.ready() && displayNamesHandle.ready();

  let announcements;
  let displayNames;
  if (!ready) {
    announcements = [];
    displayNames = {};
  } else {
    announcements = Models.Announcements.find({ hunt: params.huntId }, { sort: { createdAt: 1 } }).fetch();
    displayNames = Models.Profiles.displayNames();
  }
  const canCreateAnnouncements = Roles.userHasPermission(Meteor.userId(), 'mongo.announcements.insert');

  return {
    ready,
    announcements,
    canCreateAnnouncements,
    displayNames,
  };
})(AnnouncementsPage);
AnnouncementsPageContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};
export default AnnouncementsPageContainer;
