import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import React, { useCallback, useEffect, useMemo } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import Modal from "react-bootstrap/Modal";
import { createPortal } from "react-dom";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import type { HuntType } from "../../lib/models/Hunts";
import Hunts from "../../lib/models/Hunts";
import {
  userMayAddUsersToHunt,
  userMayUpdateHunt,
} from "../../lib/permission_stubs";
import huntForHuntApp from "../../lib/publications/huntForHuntApp";
import acceptUserHuntTerms from "../../methods/acceptUserHuntTerms";
import addHuntUser from "../../methods/addHuntUser";
import undestroyHunt from "../../methods/undestroyHunt";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import Markdown from "./Markdown";
import setUserStatus from "../../methods/setUserStatus";

const HuntDeletedError = React.memo(
  ({ hunt, canUndestroy }: { hunt: HuntType; canUndestroy: boolean }) => {
    const undestroy = useCallback(() => {
      undestroyHunt.call({ huntId: hunt._id });
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
          This hunt has been deleted, so there&apos;s nothing much to see here
          anymore.
        </Alert>

        <ButtonToolbar>
          <Button variant="light" onClick={goBack}>
            Whoops! Get me out of here
          </Button>
          {undestroyButton}
        </ButtonToolbar>
      </div>
    );
  },
);

const HuntMemberError = React.memo(
  ({ hunt, canJoin }: { hunt: HuntType; canJoin: boolean }) => {
    const join = useCallback(() => {
      const user = Meteor.user();
      if (!user?.emails) {
        return;
      }
      const email = user.emails[0];
      if (!email) {
        return;
      }
      addHuntUser.call({ huntId: hunt._id, email: email.address });
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

    return (
      <div>
        <Alert variant="warning">
          You&apos;re not signed up for this hunt ({hunt.name}) yet.
        </Alert>

        <Markdown text={hunt.signupMessage ?? ""} />

        <ButtonToolbar>
          <Button variant="light" onClick={goBack}>
            Whoops! Get me out of here
          </Button>
          {joinButton}
        </ButtonToolbar>
      </div>
    );
  },
);

const HuntApp = React.memo(() => {
  const huntId = useParams<"huntId">().huntId!;
  const huntLoading = useTypedSubscribe(huntForHuntApp, { huntId });
  const loading = huntLoading();

  useEffect(() => {
    const handleVisibilityChange = () => {
      const status = document.visibilityState === "visible" ? "online" : "away";
      setUserStatus.call({ hunt: huntId, type: "status", status: status });
    };
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setUserStatus.call({ hunt: huntId, type: "status", status: "offline" });
    };
  }, [huntId]);

  useSubscribe(
    "userStatus.inc",
    huntId,
    "status",
    document.visibilityState === "visible" ? "online" : "away",
  );

  const hunt = useTracker(() => Hunts.findOneAllowingDeleted(huntId), [huntId]);
  const { member, canUndestroy, canJoin, mustAcceptTerms } = useTracker(() => {
    const user = Meteor.user();
    const termsAccepted = user?.huntTermsAcceptedAt?.[huntId] ?? false;
    return {
      member: user?.hunts?.includes(huntId) ?? false,
      canUndestroy: userMayUpdateHunt(user, hunt),
      canJoin: userMayAddUsersToHunt(user, hunt),
      mustAcceptTerms: hunt?.termsOfUse && !termsAccepted,
    };
  }, [huntId, hunt]);

  const acceptTerms = useCallback(
    () => acceptUserHuntTerms.call({ huntId }),
    [huntId],
  );

  useBreadcrumb({
    title: loading || !hunt ? "loading..." : hunt.name,
    path: `/hunts/${huntId}`,
  });

  const title = hunt ? `${hunt.name} :: Jolly Roger` : "";

  useDocumentTitle(title);

  if (loading) {
    return <span>loading...</span>;
  }

  if (!hunt) {
    return <span>This hunt does not exist</span>;
  }

  if (hunt.deleted) {
    return <HuntDeletedError hunt={hunt} canUndestroy={canUndestroy} />;
  }

  if (!member) {
    return <HuntMemberError hunt={hunt} canJoin={canJoin} />;
  }

  let termsModal = null;
  if (mustAcceptTerms) {
    termsModal = createPortal(
      <Modal show size="lg">
        <Modal.Body>
          <Markdown text={hunt.termsOfUse!} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={acceptTerms}>
            Accept
          </Button>
        </Modal.Footer>
      </Modal>,
      document.body,
    );
  }

  return (
    <>
      {termsModal}
      <Outlet />
    </>
  );
});

export default HuntApp;
