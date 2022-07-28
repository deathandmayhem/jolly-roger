import TypedMethod from './TypedMethod';

export default new TypedMethod<{ huntId: string, emails: string[] }, void>(
  'Hunts.methods.bulkAddUsers'
);
