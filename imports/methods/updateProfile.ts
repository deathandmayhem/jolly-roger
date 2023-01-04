import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  displayName: string,
  phoneNumber?: string,
  dingwords: string[],
}, void>('Users.methods.updateProfile');
