import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { OAuth } from 'meteor/oauth';
import { Random } from 'meteor/random';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { API_BASE, DiscordOAuthScopes } from '../lib/discord';

// Psuedo-collection used by setup for selecting guild
export type DiscordGuildType = {
  _id: string;
  name: string;
}
export const DiscordGuilds = new Mongo.Collection<DiscordGuildType>('discord.guilds');

// Pseudo-collection used by hunt config for selecting channel
export type DiscordChannelType = {
  _id: string;
  name: string;
  type: number;
  position: number | undefined;
}
export const DiscordChannels = new Mongo.Collection<DiscordChannelType>('discord.channels');

function requestDiscordCredential(credentialRequestCompleteCallback: any) {
  const options = {};
  const config = ServiceConfiguration.configurations.findOne({ service: 'discord' });
  if (!config) {
    if (credentialRequestCompleteCallback) {
      credentialRequestCompleteCallback(new Meteor.Error(400, 'Discord service not configured'));
    }
    return;
  }

  const credentialToken = Random.secret();
  // eslint-disable-next-line no-underscore-dangle
  const loginStyle = OAuth._loginStyle('discord', config, options || {});
  const loginUrlParameters = {
    response_type: 'code',
    client_id: config.appId,
    scope: DiscordOAuthScopes.join(' '),
    redirect_uri: OAuth._redirectUri('discord', config),
    // eslint-disable-next-line no-underscore-dangle
    state: OAuth._stateParam(loginStyle, credentialToken, undefined),
  };
  const loginUrlParamString = Object.keys(loginUrlParameters).map((param) => {
    return `${encodeURIComponent(param)}=${encodeURIComponent((<any> loginUrlParameters)[param])}`;
  }).join('&');
  const loginUrl = `${API_BASE}/oauth2/authorize?${loginUrlParamString}`;

  OAuth.launchLogin({
    loginService: 'discord',
    loginStyle,
    loginUrl,
    credentialRequestCompleteCallback,
    credentialToken,
  });
}

export { requestDiscordCredential };
