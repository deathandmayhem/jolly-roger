window.onbeforeunload = () => {
  if (Meteor.connection._anyMethodsAreOutstanding()) {
    return 'There are requests to the server that are still pending. If you ' +
      'navigate away from this page, those changes may be lost.';
  }
};
