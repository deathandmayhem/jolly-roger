import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import DOMPurify from 'dompurify';
import marked from 'marked';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import {
  withRouter, RouteComponentProps, Switch, Redirect, Route,
} from 'react-router';
import Hunts from '../../lib/models/hunts';
import { HuntType } from '../../lib/schemas/hunts';
import { withBreadcrumb } from '../hooks/breadcrumb';
import AnnouncementsPage from './AnnouncementsPage';
import CelebrationCenter from './CelebrationCenter';
import DocumentTitle from './DocumentTitle';
import GuessQueuePage from './GuessQueuePage';
import HuntProfileListPage from './HuntProfileListPage';
import PuzzleListPage from './PuzzleListPage';
import PuzzlePage from './PuzzlePage';

interface HuntDeletedErrorProps extends RouteComponentProps {
  hunt: HuntType;
  canUndestroy: boolean;
}

class HuntDeletedError extends React.PureComponent<HuntDeletedErrorProps> {
  undestroy = () => {
    Hunts.undestroy(this.props.hunt._id);
  };

  undestroyButton = () => {
    if (this.props.canUndestroy) {
      return (
        <Button variant="primary" onClick={this.undestroy}>
          Undelete this hunt
        </Button>
      );
    }
    return null;
  };

  render() {
    return (
      <div>
        <Alert variant="danger">
          This hunt has been deleted, so there&apos;s nothing much to see here anymore.
        </Alert>

        <ButtonToolbar>
          <Button variant="light" onClick={this.props.history.goBack}>
            Whoops! Get me out of here
          </Button>
          {this.undestroyButton()}
        </ButtonToolbar>
      </div>
    );
  }
}

const HuntDeletedErrorWithRouter = withRouter(HuntDeletedError);

interface HuntMemberErrorProps extends RouteComponentProps {
  hunt: HuntType;
  canJoin: boolean;
}

class HuntMemberError extends React.PureComponent<HuntMemberErrorProps> {
  join = () => {
    const user = Meteor.user();
    if (!user || !user.emails) {
      return;
    }
    Meteor.call('addToHunt', this.props.hunt._id, user.emails[0].address);
  };

  joinButton = () => {
    if (this.props.canJoin) {
      return (
        <Button variant="primary" onClick={this.join}>
          Use operator permissions to join
        </Button>
      );
    }
    return null;
  };

  render() {
    const msg = marked(DOMPurify.sanitize(this.props.hunt.signupMessage || ''));
    return (
      <div>
        <Alert variant="warning">
          You&apos;re not signed up for this hunt (
          {this.props.hunt.name}
          ) yet.
        </Alert>

        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: msg }}
        />

        <ButtonToolbar>
          <Button variant="light" onClick={this.props.history.goBack}>
            Whoops! Get me out of here
          </Button>
          {this.joinButton()}
        </ButtonToolbar>
      </div>
    );
  }
}

const HuntMemberErrorWithRouter = withRouter(HuntMemberError);

interface HuntAppParams {
  huntId: string;
}

interface HuntAppWithRouterParams extends RouteComponentProps<HuntAppParams> {
}

interface HuntAppProps extends HuntAppWithRouterParams {
  ready: boolean;
  hunt?: HuntType;
  member: boolean;
  canUndestroy: boolean;
  canJoin: boolean;
}

class HuntApp extends React.PureComponent<HuntAppProps> {
  renderBody = () => {
    if (!this.props.ready) {
      return <span>loading...</span>;
    }

    if (!this.props.hunt) {
      return <span>This hunt does not exist</span>;
    }

    if (this.props.hunt.deleted) {
      return (
        <HuntDeletedErrorWithRouter
          hunt={this.props.hunt}
          canUndestroy={this.props.canUndestroy}
        />
      );
    }

    if (!this.props.member) {
      return <HuntMemberErrorWithRouter hunt={this.props.hunt} canJoin={this.props.canJoin} />;
    }

    const match = this.props.match;
    return (
      <Route path="/">
        <Switch>
          <Route path={`${match.path}/announcements`} component={AnnouncementsPage} />
          <Route path={`${match.path}/guesses`} component={GuessQueuePage} />
          <Route path={`${match.path}/hunters`} component={HuntProfileListPage} />
          <Route path={`${match.path}/puzzles/:puzzleId`} component={PuzzlePage} />
          <Route path={`${match.path}/puzzles`} component={PuzzleListPage} />
          <Route
            path={`${match.path}`}
            exact
            render={() => {
              return <Redirect to={`/hunts/${this.props.match.params.huntId}/puzzles`} />;
            }}
          />
        </Switch>
      </Route>
    );
  };

  render() {
    const title = this.props.hunt ? `${this.props.hunt.name} :: Jolly Roger` : '';

    return (
      <DocumentTitle title={title}>
        <div>
          <CelebrationCenter huntId={this.props.match.params.huntId} />
          {this.renderBody()}
        </div>
      </DocumentTitle>
    );
  }
}

const huntsCrumb = withBreadcrumb<HuntAppWithRouterParams>({ title: 'Hunts', path: '/hunts' });
const huntCrumb = withBreadcrumb(({ match, ready, hunt }: HuntAppProps) => {
  return {
    title: (ready && hunt) ? hunt.name : 'loading...',
    path: `/hunts/${match.params.huntId}`,
  };
});
const tracker = withTracker(({ match }: HuntAppWithRouterParams) => {
  const userHandle = Meteor.subscribe('selfHuntMembership');
  // Subscribe to deleted and non-deleted hunts separately so that we can reuse
  // the non-deleted subscription
  const huntHandle = Meteor.subscribe('mongo.hunts', { _id: match.params.huntId });
  const deletedHuntHandle = Meteor.subscribe('mongo.hunts.deleted', {
    _id: match.params.huntId,
  });
  const user = Meteor.user();
  const member = !!user && _.contains(user.hunts, match.params.huntId);
  return {
    ready: userHandle.ready() && huntHandle.ready() && deletedHuntHandle.ready(),
    hunt: Hunts.findOneAllowingDeleted(match.params.huntId),
    member,
    canUndestroy: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
    canJoin: Roles.userHasPermission(Meteor.userId(), 'hunt.join', match.params.huntId),
  };
});

const HuntAppContainer = huntsCrumb(tracker(huntCrumb(HuntApp)));

export default HuntAppContainer;
