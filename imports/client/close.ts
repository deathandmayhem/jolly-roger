import { Meteor } from "meteor/meteor";

// oxlint-disable-next-line unicorn/prefer-add-event-listener -- onbeforeunload's return value triggers the confirmation dialog
window.onbeforeunload = () => {
  if ((Meteor as any).connection._anyMethodsAreOutstanding()) {
    return (
      "There are requests to the server that are still pending. If you " +
      "navigate away from this page, those changes may be lost."
    );
  }
  return undefined;
};
