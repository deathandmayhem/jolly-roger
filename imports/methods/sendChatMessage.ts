import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  puzzleId: string,
  message: string,
}, void>(
  'ChatMessages.methods.send'
);
