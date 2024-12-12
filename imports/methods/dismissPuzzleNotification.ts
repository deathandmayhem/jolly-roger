import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ puzzleNotificationId: string }, void>(
  "PuzzleNotifications.methods.dismiss",
);
