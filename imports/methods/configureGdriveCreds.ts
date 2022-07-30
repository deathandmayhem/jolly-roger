import TypedMethod from './TypedMethod';

export default new TypedMethod<{ key: string, secret: string }, void>(
  'Setup.methods.configureGdriveCreds'
);
