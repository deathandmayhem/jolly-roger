import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React, { useCallback, useMemo } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import {
  Outlet, useNavigate, useParams,
} from 'react-router-dom';
import Hunts from '../../lib/models/Hunts';
import { userMayAddUsersToHunt, userMayUpdateHunt } from '../../lib/permission_stubs';
import { HuntType } from '../../lib/schemas/Hunt';
import addHuntUser from '../../methods/addHuntUser';
import { useBreadcrumb } from '../hooks/breadcrumb';
import useDocumentTitle from '../hooks/useDocumentTitle';
import markdown from '../markdown';
import CelebrationCenter from './CelebrationCenter';

const HuntDeletedError = React.memo(({ hunt, canUndestroy }: {
  hunt: HuntType;
  canUndestroy: boolean;
}) => {
  const undestroy = useCallback(() => {
    Hunts.undestroy(hunt._id);
  }, [hunt._id]);

  const undestroyButton = useMemo(() => {
    if (canUndestroy) {
      return (
        <Button variant="primary" onClick={undestroy}>
          Undelete this hunt
        </Button>
      );
    }
    return null;
  }, [canUndestroy, undestroy]);

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

const HuntMemberError = React.memo(({ hunt, canJoin }: {
  hunt: HuntType;
  canJoin: boolean;
}) => {
  const join = useCallback(() => {
    const user = Meteor.user();
    if (!user || !user.emails) {
      return;
    }
    addHuntUser.call({ huntId: hunt._id, email: user.emails[0].address });
  }, [hunt._id]);

  const joinButton = useMemo(() => {
    if (canJoin) {
      return (
        <Button variant="primary" onClick={join}>
          Use operator permissions to join
        </Button>
      );
    }
    return null;
  }, [canJoin, join]);

  const navigate = useNavigate();
  const goBack = useCallback(() => navigate(-1), [navigate]);

  const msg = markdown(hunt.signupMessage || '');
  return (
    <div>
      <Alert variant="warning">
        You&apos;re not signed up for this hunt (
        {hunt.name}
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

const HuntApp = React.memo(() => {
  const huntId = useParams<'huntId'>().huntId!;

  // Subscribe to deleted and non-deleted hunts separately so that we can reuse
  // the non-deleted subscription
  const huntLoading = useSubscribe('mongo.hunts', { _id: huntId });
  const deletedHuntLoading = useSubscribe('mongo.hunts.deleted', { _id: huntId });
  const loading = huntLoading() || deletedHuntLoading();

  const hunt = useTracker(() => Hunts.findOneAllowingDeleted(huntId), [huntId]);
  const {
    member, canUndestroy, canJoin,
  } = useTracker(() => {
    return {
      member: Meteor.user()?.hunts?.includes(huntId) ?? false,
      canUndestroy: userMayUpdateHunt(Meteor.userId(), huntId),
      canJoin: userMayAddUsersToHunt(Meteor.userId(), huntId),
    };
  }, [huntId]);

  useBreadcrumb({
    title: (loading || !hunt) ? 'loading...' : hunt.name,
    path: `/hunts/${huntId}`,
  });

  const title = hunt ? `${hunt.name} :: Jolly Roger` : '';

  useDocumentTitle(title);

  const body = useMemo(() => {
    if (loading) {
      return <span>loading...</span>;
    }

    if (!hunt) {
      return <span>This hunt does not exist</span>;
    }

    if (hunt.deleted) {
      return (
        <HuntDeletedError
          hunt={hunt}
          canUndestroy={canUndestroy}
        />
      );
    }

    if (!member) {
      return <HuntMemberError hunt={hunt} canJoin={canJoin} />;
    }

    return (
      <Outlet />
    );
  }, [
    loading, member, hunt, canUndestroy, canJoin,
  ]);

  return (
    <div>
      <CelebrationCenter huntId={huntId} />
      {body}
    </div>
  );
});

export default HuntApp;
