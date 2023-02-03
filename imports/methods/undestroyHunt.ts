import TypedMethod from './TypedMethod';

export default new TypedMethod<{ huntId: string }, void>(
  'Hunts.methods.undestroy'
);
