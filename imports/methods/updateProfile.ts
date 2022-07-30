import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  displayName: string,
  phoneNumber: string,
  muteApplause: boolean,
  dingwords: string[],
}, void>('Users.methods.updateProfile');
