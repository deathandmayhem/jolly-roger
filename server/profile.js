Meteor.methods({
  saveProfile(newProfile) {
    // Allow users to update/upsert profile data.
    check(this.userId, String);
    check(newProfile, {
      displayName: String,
      locationDuringHunt: String,
      phoneNumber: String,
      slackHandle: String,
    });
    var user = Meteor.users.findOne(this.userId);
    var primaryEmail = user.emails[0].address;
    var result = Models.Profiles.update({
      _id: this.userId,
    }, {
      $set: {
        displayName: newProfile.displayName,
        locationDuringHunt: newProfile.locationDuringHunt,
        primaryEmail: primaryEmail,
        phoneNumber: newProfile.phoneNumber,
        slackHandle: newProfile.slackHandle,
        deleted: false,
      }
    }, {
      upsert: true
    });
  },
});
