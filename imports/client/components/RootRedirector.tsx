import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { Redirect } from 'react-router';
import HasUsers from '../has_users';

interface RootRedirectorProps {
  loggingIn: boolean;
  userId: string | null;
  hasUsersReady: boolean;
  hasUser: boolean;
}

class RootRedirector extends React.Component<RootRedirectorProps> {
  render() {
    if (this.props.loggingIn) {
      return <div>loading redirector...</div>;
    }

    if (this.props.userId) {
      // Logged in.
      return <Redirect to={{ pathname: '/hunts' }} />;
    }

    // Definitely not logged in.  Wait for the hasUsers sub to be ready,
    // and then if there's a user, go to the login page, and if not, go
    // to the create-first-user page.
    if (!this.props.hasUsersReady) {
      return <div>loading redirector...</div>;
    } else if (this.props.hasUser) {
      return <Redirect to={{ pathname: '/login' }} />;
    } else {
      return <Redirect to={{ pathname: '/create-first-user' }} />;
    }
  }
}

const RootRedirectorContainer = withTracker(() => {
  const hasUsersHandle = Meteor.subscribe('hasUsers');
  const hasUser = !!HasUsers.findOne({});

  return {
    loggingIn: Meteor.loggingIn(),
    userId: Meteor.userId(),
    hasUsersReady: hasUsersHandle.ready(),
    hasUser,
  };
})(RootRedirector);

export default RootRedirectorContainer;
