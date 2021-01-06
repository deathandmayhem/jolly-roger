import { HTTP } from 'meteor/http';
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { API_BASE, DiscordOAuthScopes } from '../lib/discord';

class DiscordAPIClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  retrieveUserInfo = () => {
    let response;
    try {
      response = HTTP.get(`${API_BASE}/users/@me`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    } catch (err) {
      throw Object.assign(
        new Meteor.Error(`Failed to retrieve user data from Discord. ${err.message}`),
        { response: err.response }
      );
    }

    return {
      id: response.data.id,
      username: response.data.username,
      discriminator: response.data.discriminator,
      avatar: response.data.avatar,
    };
  };
}

class DiscordBot {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  authHeaders = () => {
    return {
      headers: {
        Authorization: `Bot ${this.botToken}`,
      },
    };
  };

  listGuilds = () => {
    const response = HTTP.get(`${API_BASE}/users/@me/guilds`, {
      ...this.authHeaders(),
    });

    return response.data;
  };

  getUserInGuild = (discordUserId: string, guildId: string) => {
    let response;
    try {
      response = HTTP.get(`${API_BASE}/guilds/${guildId}/members/${discordUserId}`, {
        ...this.authHeaders(),
      });
    } catch (err) {
      if (err.response && err.response.statusCode === 404) {
        // No such user.
        return undefined;
      }

      throw Object.assign(
        new Meteor.Error(`Failed to retrieve guild ${guildId} member with discord user id ${discordUserId}. ${err.message}`),
        { response: err.response }
      );
    }

    return response.data;
  };

  addUserToGuild = (discordUserId: string, discordUserToken: string, guildId: string) => {
    try {
      const opts = {
        ...this.authHeaders(),
        data: {
          access_token: discordUserToken,
        },
      };
      HTTP.put(`${API_BASE}/guilds/${guildId}/members/${discordUserId}`, opts);
    } catch (err) {
      throw Object.assign(
        new Meteor.Error(`Failed to add discord user ${discordUserId} to guild ${guildId}. ${err.message}`),
        { response: err.response }
      );
    }
  };

  listGuildChannels = (guildId: string) => {
    let response;
    try {
      const opts = {
        ...this.authHeaders(),
      };
      response = HTTP.get(`${API_BASE}/guilds/${guildId}/channels`, opts);
    } catch (err) {
      throw Object.assign(
        new Meteor.Error(`Failed to list channels of guild ${guildId}. ${err.message}`),
        { response: err.response }
      );
    }

    return response.data;
  };

  postMessageToChannel = (channelId: string, message: object) => {
    try {
      const opts = {
        ...this.authHeaders(),
        data: message,
      };
      HTTP.post(`${API_BASE}/channels/${channelId}/messages`, opts);
    } catch (err) {
      throw Object.assign(
        new Meteor.Error(`Failed to post message to channel ${channelId}. ${err.message}`),
        { response: err.response }
      );
    }
  };
}

const handleOauthRequest = (query: any) => {
  const config = ServiceConfiguration.configurations.findOne({ service: 'discord' });
  if (!config) {
    throw new Meteor.Error('Missing service configuration for discord');
  }

  let response;
  try {
    response = HTTP.post(`${API_BASE}/oauth2/token`, {
      params: {
        client_id: config.appId,
        client_secret: OAuth.openSecret(config.secret),
        grant_type: 'authorization_code',
        code: query.code,
        redirect_uri: OAuth._redirectUri('discord', config),
        scope: DiscordOAuthScopes.join(' '),
      },
    });
  } catch (err) {
    throw Object.assign(
      new Meteor.Error(`Failed to complete OAuth handshake with Discord. ${err.message}`),
      { response: err.response }
    );
  }

  return {
    serviceData: {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      refreshToken: response.data.refresh_token,
      receivedAt: new Date(),
      // `expiresIn` is the number of seconds since `receivedAt` at which this
      // access token expires.  The refresh token is presumably good
      // indefinitely.
      expiresIn: response.data.expires_in,
      scope: response.data.scope,
    },
  };
};

OAuth.registerService('discord', 2, null, handleOauthRequest);

export { DiscordAPIClient, DiscordBot };
