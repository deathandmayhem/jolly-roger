import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  from?: string,
  enrollSubject?: string,
  enrollMessage?: string,
  joinSubject?: string,
  joinMessage?: string,
}, void>(
  'Setup.methods.configureEmailBranding'
);
