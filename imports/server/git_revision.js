import { Meteor } from 'meteor/meteor';

Meteor.methods({
  // A dumb method to expose the git revision of the server's running build to
  // the client for easier observability.  Print from the JS console with:
  // Meteor.call("gitRevision", (err, val) => console.log(val));
  gitRevision() {
    if (process.env.GIT_REVISION) {
      return process.env.GIT_REVISION;
    } else {
      return 'development';
    }
  },
});
