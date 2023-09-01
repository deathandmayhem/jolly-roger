import TypedMethod from './TypedMethod';

export default new TypedMethod<{ bookmarkNotificationId: string }, void>(
  'BookmarkNotifications.methods.dismiss'
);
