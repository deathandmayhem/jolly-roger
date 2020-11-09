import * as t from 'io-ts';

const DiscordAccountType = t.type({
  id: t.string,
  username: t.string,
  discriminator: t.string,
  avatar: t.union([t.string, t.undefined]),
});

export default DiscordAccountType;
