import { Meteor } from "meteor/meteor";

window.onbeforeunload = () => {
  if ((Meteor as any).connection._anyMethodsAreOutstanding()) {
    return (
      "There are requests to the server that are still pending. If you " +
      "navigate away from this page, those changes may be lost."
    );
  }
  return undefined;
};
