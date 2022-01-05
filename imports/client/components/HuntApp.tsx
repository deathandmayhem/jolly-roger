import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useCallback, useMemo } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import {
  Switch, Redirect, Route, useParams, useRouteMatch,
} from 'react-router';
import { useHistory } from 'react-router-dom';
import Hunts from '../../lib/models/hunts';
import { userMayAddUsersToHunt, userMayUpdateHunt } from '../../lib/permission_stubs';
import { HuntType } from '../../lib/schemas/hunt';
import { useBreadcrumb } from '../hooks/breadcrumb';
import useDocumentTitle from '../hooks/use-document-title';
import markdown from '../markdown';
import AnnouncementsPage from './AnnouncementsPage';
import CelebrationCenter from './CelebrationCenter';
import GuessQueuePage from './GuessQueuePage';
import HuntProfileListPage from './HuntProfileListPage';
import PuzzleListPage from './PuzzleListPage';
import PuzzlePage from './PuzzlePage';

interface HuntDeletedErrorProps {
  hunt: HuntType;
  canUndestroy: boolean;
}

const HuntDeletedError = React.memo((props: HuntDeletedErrorProps) => {
  const undestroy = useCallback(() => {
    Hunts.undestroy(props.hunt._id);
  }, [props.hunt._id]);

  const undestroyButton = useMemo(() => {
    if (props.canUndestroy) {
      return (
        <Button variant="primary" onClick={undestroy}>
          Undelete this hunt
        </Button>
      );
    }
    return null;
  }, [props.canUndestroy, undestroy]);

  const history = useHistory();

  return (
    <div>
      <Alert variant="danger">
        This hunt has been deleted, so there&apos;s nothing much to see here anymore.
      </Alert>

      <ButtonToolbar>
        <Button variant="light" onClick={history.goBack}>
          Whoops! Get me out of here
        </Button>
        {undestroyButton}
      </ButtonToolbar>
    </div>
  );
});

interface HuntMemberErrorProps {
  hunt: HuntType;
  canJoin: boolean;
}

const HuntMemberError = React.memo((props: HuntMemberErrorProps) => {
  const join = useCallback(() => {
    const user = Meteor.user();
    if (!user || !user.emails) {
      return;
    }
    Meteor.call('addToHunt', props.hunt._id, user.emails[0].address);
  }, [props.hunt._id]);

  const joinButton = useMemo(() => {
    if (props.canJoin) {
      return (
        <Button variant="primary" onClick={join}>
          Use operator permissions to join
        </Button>
      );
    }
    return null;
  }, [props.canJoin, join]);

  const history = useHistory();

  const msg = markdown(props.hunt.signupMessage || '');
  return (
    <div>
      <Alert variant="warning">
        You&apos;re not signed up for this hunt (
        {props.hunt.name}
        ) yet.
      </Alert>

      <div
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: msg }}
      />

      <ButtonToolbar>
        <Button variant="light" onClick={history.goBack}>
          Whoops! Get me out of here
        </Button>
        {joinButton}
      </ButtonToolbar>
    </div>
  );
});

interface HuntAppParams {
  huntId: string;
}

interface HuntAppTracker {
  ready: boolean;
  hunt?: HuntType;
  member: boolean;
  canUndestroy: boolean;
  canJoin: boolean;
}

const HuntApp = React.memo(() => {
  useBreadcrumb({ title: 'Hunts', path: '/hunts' });

  const { huntId } = useParams<HuntAppParams>();
  const { path, url } = useRouteMatch();
  const tracker = useTracker<HuntAppTracker>(() => {
    const userHandle = Meteor.subscribe('selfHuntMembership');
    // Subscribe to deleted and non-deleted hunts separately so that we can reuse
    // the non-deleted subscription
    const huntHandle = Meteor.subscribe('mongo.hunts', { _id: huntId });
    const deletedHuntHandle = Meteor.subscribe('mongo.hunts.deleted', {
      _id: huntId,
    });
    const user = Meteor.user();
    const member = user?.hunts?.includes(huntId) ?? false;
    return {
      ready: userHandle.ready() && huntHandle.ready() && deletedHuntHandle.ready(),
      hunt: Hunts.findOneAllowingDeleted(huntId),
      member,
      canUndestroy: userMayUpdateHunt(Meteor.userId(), huntId),
      canJoin: userMayAddUsersToHunt(Meteor.userId(), huntId),
    };
  }, [huntId]);

  useBreadcrumb({
    title: (tracker.ready && tracker.hunt) ? tracker.hunt.name : 'loading...',
    path: `/hunts/${huntId}`,
  });

  const title = tracker.hunt ? `${tracker.hunt.name} :: Jolly Roger` : '';

  useDocumentTitle(title);

  const body = useMemo(() => {
    if (!tracker.ready) {
      return <span>loading...</span>;
    }

    if (!tracker.hunt) {
      return <span>This hunt does not exist</span>;
    }

    if (tracker.hunt.deleted) {
      return (
        <HuntDeletedError
          hunt={tracker.hunt}
          canUndestroy={tracker.canUndestroy}
        />
      );
    }

    if (!tracker.member) {
      return <HuntMemberError hunt={tracker.hunt} canJoin={tracker.canJoin} />;
    }

    return (
      <Route path="/">
        <Switch>
          <Route path={`${path}/announcements`} render={() => <AnnouncementsPage />} />
          <Route path={`${path}/guesses`} render={() => <GuessQueuePage />} />
          <Route path={`${path}/hunters`} render={() => <HuntProfileListPage />} />
          <Route path={`${path}/puzzles/:puzzleId`} render={() => <PuzzlePage />} />
          <Route path={`${path}/puzzles`} render={() => <PuzzleListPage />} />
          <Route path={`${path}`} exact render={() => <Redirect to={`${url}/puzzles`} />} />
        </Switch>
      </Route>
    );
  }, [
    tracker.ready, tracker.member, tracker.hunt, tracker.canUndestroy, tracker.canJoin, path, url,
  ]);

  return (
    <div>
      <CelebrationCenter huntId={huntId} />
      {body}
    </div>
  );
});

export default HuntApp;
