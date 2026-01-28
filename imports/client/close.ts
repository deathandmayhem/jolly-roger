import { Meteor } from "meteor/meteor";

window.addEventListener("beforeunload", (event) => {
  if ((Meteor as any).connection._anyMethodsAreOutstanding()) {
    event.returnValue =
      "There are requests to the server that are still pending. If you " +
      "navigate away from this page, those changes may be lost.";
  }
});
