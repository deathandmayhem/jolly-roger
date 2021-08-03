import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { Redirect } from 'react-router';
import HasUsers from '../has_users';

interface RootRedirectorTracker {
  loggingIn: boolean;
  userId: string | null;
  hasUsersReady: boolean;
  hasUser: boolean;
}

const RootRedirector = () => {
  const tracker = useTracker<RootRedirectorTracker>(() => {
    const hasUsersHandle = Meteor.subscribe('hasUsers');
    const hasUser = !!HasUsers.findOne({});

    return {
      loggingIn: Meteor.loggingIn(),
      userId: Meteor.userId(),
      hasUsersReady: hasUsersHandle.ready(),
      hasUser,
    };
  }, []);

  if (tracker.loggingIn) {
    return <div>loading redirector...</div>;
  }

  if (tracker.userId) {
    // Logged in.
    return <Redirect to={{ pathname: '/hunts' }} />;
  }

  // Definitely not logged in.  Wait for the hasUsers sub to be ready,
  // and then if there's a user, go to the login page, and if not, go
  // to the create-first-user page.
  if (!tracker.hasUsersReady) {
    return <div>loading redirector...</div>;
  } else if (tracker.hasUser) {
    return <Redirect to={{ pathname: '/login' }} />;
  } else {
    return <Redirect to={{ pathname: '/create-first-user' }} />;
  }
};

export default RootRedirector;
