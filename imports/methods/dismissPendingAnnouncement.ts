import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ pendingAnnouncementId: string }, void>(
  "PendingAnnouncements.methods.dismiss",
);
