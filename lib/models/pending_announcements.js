// Broadcast announcements that have not yet been viewed by a given
// user
Schemas.PendingAnnouncements = new SimpleSchema([
  Schemas.Base,
  {
    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    announcement: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    user: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
  },
]);

Models.PendingAnnouncements = new Models.Base('pending_announcements');
Models.PendingAnnouncements.attachSchema(Schemas.PendingAnnouncements);
Models.PendingAnnouncements.publish(function(q) {
  // It's sufficient to use the user property for filtering here; we
  // don't need to pay attention to the hunt ID
  return _.chain(q).
    clone().
    extend({user: this.userId}).
    value();
});
