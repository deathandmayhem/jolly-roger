import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useCallback, useMemo } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import {
  Navigate, Route, Routes, useNavigate, useParams,
} from 'react-router-dom';
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

  const navigate = useNavigate();
  const goBack = useCallback(() => navigate(-1), [navigate]);

  return (
    <div>
      <Alert variant="danger">
        This hunt has been deleted, so there&apos;s nothing much to see here anymore.
      </Alert>

      <ButtonToolbar>
        <Button variant="light" onClick={goBack}>
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

  const navigate = useNavigate();
  const goBack = useCallback(() => navigate(-1), [navigate]);

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
        <Button variant="light" onClick={goBack}>
          Whoops! Get me out of here
        </Button>
        {joinButton}
      </ButtonToolbar>
    </div>
  );
});

interface HuntAppTracker {
  ready: boolean;
  hunt?: HuntType;
  member: boolean;
  canUndestroy: boolean;
  canJoin: boolean;
}

const HuntApp = React.memo(() => {
  useBreadcrumb({ title: 'Hunts', path: '/hunts' });

  const huntId = useParams<'huntId'>().huntId!;
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
      <Routes>
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="guesses" element={<GuessQueuePage />} />
        <Route path="hunters/*" element={<HuntProfileListPage />} />
        <Route path="puzzles/:puzzleId" element={<PuzzlePage />} />
        <Route path="puzzles" element={<PuzzleListPage />} />
        <Route path="" element={<Navigate to="puzzles" />} />
      </Routes>
    );
  }, [
    tracker.ready, tracker.member, tracker.hunt, tracker.canUndestroy, tracker.canJoin,
  ]);

  return (
    <div>
      <CelebrationCenter huntId={huntId} />
      {body}
    </div>
  );
});

export default HuntApp;
