import { Meteor } from "meteor/meteor";

window.addEventListener("beforeunload", (event) => {
  if ((Meteor as any).connection._anyMethodsAreOutstanding()) {
    event.preventDefault();
  }
});
