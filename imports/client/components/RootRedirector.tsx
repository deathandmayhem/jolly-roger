import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import { Redirect } from 'react-router';

interface RootRedirectorProps {
  loggingIn: boolean;
  userId: string | null;
}

class RootRedirector extends React.Component<RootRedirectorProps> {
  render() {
    if (this.props.loggingIn) {
      return <div>loading redirector...</div>;
    }

    if (this.props.userId) {
      return <Redirect to={{ pathname: '/hunts' }} />;
    } else {
      return <Redirect to={{ pathname: '/login' }} />;
    }
  }
}

const RootRedirectorContainer = withTracker(() => {
  return {
    loggingIn: Meteor.loggingIn(),
    userId: Meteor.userId(),
  };
})(RootRedirector);

export default RootRedirectorContainer;
