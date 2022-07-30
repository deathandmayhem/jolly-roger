import TypedMethod from './TypedMethod';

export default new TypedMethod<{ targetUserId: string, huntId: string }, void>(
  'Users.method.promoteOperator'
);
