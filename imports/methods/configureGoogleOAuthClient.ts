import TypedMethod from './TypedMethod';

export default new TypedMethod<{ clientId: string, secret: string }, void>(
  'Setup.methods.configureGoogleOAuthClient',
);
