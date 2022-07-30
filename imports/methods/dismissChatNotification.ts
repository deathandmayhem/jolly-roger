import TypedMethod from './TypedMethod';

export default new TypedMethod<{ chatNotificationId: string }, void>(
  'ChatNotifications.methods.dismiss'
);
