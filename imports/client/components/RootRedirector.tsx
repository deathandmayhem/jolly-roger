import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { Navigate } from "react-router-dom";
import HasUsers from "../HasUsers";

const RootRedirector = () => {
  const hasUsersLoading = useSubscribe("hasUsers");
  const loading = hasUsersLoading();

  const { loggingIn, userId, hasUser } = useTracker(() => {
    return {
      loggingIn: Meteor.loggingIn(),
      userId: Meteor.userId(),
      hasUser: !!HasUsers.findOne({}),
    };
  }, []);

  if (loggingIn) {
    return <div>loading redirector...</div>;
  }

  if (userId) {
    // Logged in.
    return <Navigate to="/hunts" replace />;
  }

  // Definitely not logged in.  Wait for the hasUsers sub to be ready,
  // and then if there's a user, go to the login page, and if not, go
  // to the create-first-user page.
  if (loading) {
    return <div>loading redirector...</div>;
  } else if (hasUser) {
    return <Navigate to="/login" replace />;
  } else {
    return <Navigate to="/create-first-user" replace />;
  }
};

export default RootRedirector;
