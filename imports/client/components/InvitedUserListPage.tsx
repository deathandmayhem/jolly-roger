import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { Alert, AlertHeading } from "react-bootstrap";
import styled from "styled-components";
import isAdmin from "../../lib/isAdmin";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import huntsAll from "../../lib/publications/huntsAll";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import InvitedUserList from "./InvitedUserList";

const ListItemContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const RightItems = styled.div`
  margin-left: auto;
  padding-right: 0.5rem;

  * {
    margin: 0 0.25rem;
  }
`;

const InvitedUserListPage = () => {
  useBreadcrumb({
    title: "Pending Invitations",
    path: "/users/invited",
  });

  const canConfigure = useTracker(() => isAdmin(Meteor.user()), []);

  const profilesLoading = useSubscribe("invitedUsers");
  const huntsLoading = useTypedSubscribe(huntsAll);
  const loading = profilesLoading() || huntsLoading();

  const users = useTracker(() => {
    return loading
      ? []
      : MeteorUsers.find(
          { "services.password.enroll": { $exists: true } },
          { sort: { createdAt: 1 } },
        ).fetch();
  }, [loading]);

  const hunts = useTracker(() => {
    return loading
      ? []
      : Hunts.find({}, { sort: { createdAt: -1 } })
          .fetch()
          .reduce((acc, hunt) => {
            if (!Object.hasOwn(acc, hunt._id)) {
              acc[hunt._id] = hunt.name;
            }
            return acc;
          }, {});
  });

  if (!canConfigure) {
    return (
      <div>
        <h1>Not authorized</h1>
        <p>You don't have access to view this content.</p>
      </div>
    );
  }

  if (loading) {
    return <div>loading...</div>;
  }
  return (
    <div>
      {users.length === 0 && (
        <Alert variant="info">
          <AlertHeading>No pending invitations</AlertHeading>Invite someone from
          a hunt.
        </Alert>
      )}
      {users.length > 0 && (
        <>
          <h2>Pending Invitations</h2>
          <InvitedUserList users={users} hunts={hunts} />
        </>
      )}
    </div>
  );
};

export default InvitedUserListPage;
