import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import React from "react";
import Container from "react-bootstrap/Container";
import MeteorUsers from "../../lib/models/MeteorUsers";

const HistoryPage = () => {
  const initialUserId = Meteor.userId()!;

  const profileLoading = useSubscribe("profile", initialUserId);
  const callActivityLoading = useSubscribe("ownCallActivity");
  const chatMessagesLoading = useSubscribe("ownChatMessages");
  const docActivityLoading = useSubscribe("ownDocActivities");
  const loading =
    profileLoading() ||
    callActivityLoading() ||
    chatMessagesLoading() ||
    docActivityLoading();

  const user = useTracker(() => {
    return loading ? undefined : MeteorUsers.findOne(initialUserId);
  }, [initialUserId, loading]);

  return <Container>{user?.displayName ?? "loading"}</Container>;
};

export default HistoryPage;
