import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import marked from 'marked';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from '@ebroder/react-breadcrumbs-context';
import subsCache from '../subsCache.js';
import AnnouncementsSchema from '../../lib/schemas/announcements.js';
import Announcements from '../../lib/models/announcements.js';
import Profiles from '../../lib/models/profiles.js';

/* eslint-disable max-len */

class AnnouncementForm extends React.Component {
  static propTypes = {
    huntId: PropTypes.string.isRequired,
  };

  state = {
    message: '',
    submitState: 'idle',
    errorMessage: '',
  };

  setMessage = (event) => {
    this.setState({
      message: event.target.value,
    });
  };

  postAnnouncement = () => {
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
  };

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
  }
}

class Announcement extends React.Component {
  static propTypes = {
    announcement: PropTypes.shape(AnnouncementsSchema.asReactPropTypes()).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  };

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
  }
}

class AnnouncementsPage extends React.Component {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    canCreateAnnouncements: PropTypes.bool.isRequired,
    announcements: PropTypes.arrayOf(PropTypes.shape(AnnouncementsSchema.asReactPropTypes())).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string).isRequired,
  };

  render() {
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
  }
}

const crumb = withBreadcrumb(({ params }) => {
  return { title: 'Announcements', link: `/hunts/${params.huntId}/announcements` };
});
const tracker = withTracker(({ params }) => {
  // We already have subscribed to mongo.announcements on the main page, since we want to be able
  // to show them on any page.  So we don't *need* to make the subscription here...
  // ...except that we might want to wait to render until we've received all of them?  IDK.
  const announcementsHandle = subsCache.subscribe('mongo.announcements', { hunt: params.huntId });
  const displayNamesHandle = Profiles.subscribeDisplayNames(subsCache);
  const ready = announcementsHandle.ready() && displayNamesHandle.ready();

  let announcements;
  let displayNames;
  if (!ready) {
    announcements = [];
    displayNames = {};
  } else {
    announcements = Announcements.find({ hunt: params.huntId }, { sort: { createdAt: 1 } }).fetch();
    displayNames = Profiles.displayNames();
  }
  const canCreateAnnouncements = Roles.userHasPermission(Meteor.userId(), 'mongo.announcements.insert');

  return {
    ready,
    announcements,
    canCreateAnnouncements,
    displayNames,
  };
});

const AnnouncementsPageContainer = _.compose(crumb, tracker)(AnnouncementsPage);
AnnouncementsPageContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};
export default AnnouncementsPageContainer;
