import TypedMethod from './TypedMethod';

export default new TypedMethod<{ guild?: { id: string, name: string } }, void>(
  'Setup.methods.configureDiscordBotGuild'
);
