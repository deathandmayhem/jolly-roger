import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  puzzleId: string,
  content: string,
}, void>(
  'ChatMessages.methods.send'
);
