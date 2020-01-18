import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import DOMPurify from 'dompurify';
import marked from 'marked';
import moment from 'moment';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import Announcements from '../../lib/models/announcements';
import Profiles from '../../lib/models/profiles';
import { AnnouncementType } from '../../lib/schemas/announcements';

/* eslint-disable max-len */

interface AnnouncementFormProps {
  huntId: string;
}

enum AnnouncementFormSubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  FAILED = 'failed',
}

interface AnnouncementFormState {
  message: string;
  submitState: AnnouncementFormSubmitState;
  errorMessage: string;
}

class AnnouncementForm extends React.Component<AnnouncementFormProps, AnnouncementFormState> {
  constructor(props: AnnouncementFormProps) {
    super(props);
    this.state = {
      message: '',
      submitState: AnnouncementFormSubmitState.IDLE,
      errorMessage: '',
    };
  }

  setMessage = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      message: event.target.value,
    });
  };

  postAnnouncement = () => {
    if (this.state.message) {
      this.setState({
        submitState: AnnouncementFormSubmitState.SUBMITTING,
      });
      Meteor.call('postAnnouncement', this.props.huntId, this.state.message, (error?: Error) => {
        if (error) {
          this.setState({
            submitState: AnnouncementFormSubmitState.FAILED,
            errorMessage: error.message,
          });
        } else {
          this.setState({
            message: '',
            submitState: AnnouncementFormSubmitState.IDLE,
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

interface AnnouncementProps {
  announcement: AnnouncementType;
  displayNames: Record<string, string>;
}

class Announcement extends React.Component<AnnouncementProps> {
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
        <div
          dangerouslySetInnerHTML={{ __html: marked(DOMPurify.sanitize(ann.message)) }}
        />
      </div>
    );
  }
}

interface AnnouncementsPageParams {
  params: {huntId: string};
}

interface AnnouncementsPageProps extends AnnouncementsPageParams {
  ready: boolean;
  canCreateAnnouncements: boolean;
  announcements: AnnouncementType[];
  displayNames: Record<string, string>;
}

class AnnouncementsPage extends React.Component<AnnouncementsPageProps> {
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

const crumb = withBreadcrumb(({ params }: AnnouncementsPageParams) => {
  return { title: 'Announcements', path: `/hunts/${params.huntId}/announcements` };
});
const tracker = withTracker(({ params }: AnnouncementsPageParams) => {
  // We already have subscribed to mongo.announcements on the main page, since we want to be able
  // to show them on any page.  So we don't *need* to make the subscription here...
  // ...except that we might want to wait to render until we've received all of them?  IDK.
  const announcementsHandle = Meteor.subscribe('mongo.announcements', { hunt: params.huntId });
  const displayNamesHandle = Profiles.subscribeDisplayNames();
  const ready = announcementsHandle.ready() && displayNamesHandle.ready();

  let announcements: AnnouncementType[];
  let displayNames: Record<string, string>;
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

const AnnouncementsPageContainer = crumb(tracker(AnnouncementsPage));
export default AnnouncementsPageContainer;
