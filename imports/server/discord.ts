import { fetch } from "meteor/fetch";
import { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { ServiceConfiguration } from "meteor/service-configuration";
import { API_BASE, DiscordOAuthScopes } from "../lib/discord";

class DiscordAPIClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  retrieveUserInfo = async () => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/users/@me`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    } catch (e) {
      throw new Meteor.Error(
        `Failed to retrieve user data from Discord. ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw Object.assign(
        new Meteor.Error(
          `Failed to retrieve user data from Discord. ${response.statusText}`,
        ),
        { response: text },
      );
    }

    const data = await response.json();

    return {
      id: data.id,
      username: data.username,
      avatar: data.avatar ?? undefined,
    };
  };
}

class DiscordBot {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  authHeaders = (): RequestInit => {
    return {
      headers: {
        Authorization: `Bot ${this.botToken}`,
      },
    };
  };

  listGuilds = async () => {
    let response: Response;
    try {
      response = await fetch(
        `${API_BASE}/users/@me/guilds`,
        this.authHeaders(),
      );
    } catch (e) {
      throw new Meteor.Error(
        `Failed to retrieve guilds from Discord. ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw Object.assign(
        new Meteor.Error(
          `Failed to retrieve guilds from Discord. ${response.statusText}`,
        ),
        { response: text },
      );
    }

    return response.json();
  };

  getUserInGuild = async (discordUserId: string, guildId: string) => {
    let response: Response;
    try {
      response = await fetch(
        `${API_BASE}/guilds/${guildId}/members/${discordUserId}`,
        this.authHeaders(),
      );
    } catch (e) {
      throw new Meteor.Error(
        `Failed to retrieve guild ${guildId} member ${discordUserId} from Discord. ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    if (response.status === 404) {
      // No such user
      return undefined;
    }

    if (!response.ok) {
      const text = await response.text();
      throw Object.assign(
        new Meteor.Error(
          `Failed to retrieve guild ${guildId} member ${discordUserId} from Discord. ${response.statusText}`,
        ),
        { response: text },
      );
    }

    return response.json();
  };

  addUserToGuild = async (
    discordUserId: string,
    discordUserToken: string,
    guildId: string,
  ) => {
    const opts = this.authHeaders();
    opts.method = "PUT";
    opts.body = JSON.stringify({ access_token: discordUserToken });
    opts.headers = { ...opts.headers, "Content-Type": "application/json" };
    let response: Response;
    try {
      response = await fetch(
        `${API_BASE}/guilds/${guildId}/members/${discordUserId}`,
        opts,
      );
    } catch (e) {
      throw new Meteor.Error(
        `Failed to add discord user ${discordUserId} to guild ${guildId}. ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw Object.assign(
        new Meteor.Error(
          `Failed to add discord user ${discordUserId} to guild ${guildId}. ${response.statusText}`,
        ),
        { response: text },
      );
    }
  };

  addUserToRole = async (
    discordUserId: string,
    guildId: string,
    roleId: string,
  ) => {
    let response: Response;
    try {
      response = await fetch(
        `${API_BASE}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
        {
          ...this.authHeaders(),
          method: "PUT",
        },
      );
    } catch (e) {
      throw new Meteor.Error(
        `Failed to add discord user ${discordUserId} to role ${roleId} (guild ${guildId}). ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw Object.assign(
        new Meteor.Error(
          `Failed to add discord user ${discordUserId} to role ${roleId} (guild ${guildId}). ${response.statusText}`,
        ),
        { response: text },
      );
    }
  };

  listGuildChannels = async (guildId: string) => {
    let response: Response;
    try {
      response = await fetch(
        `${API_BASE}/guilds/${guildId}/channels`,
        this.authHeaders(),
      );
    } catch (e) {
      throw new Meteor.Error(
        `Failed to list channels of guild ${guildId}. ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw Object.assign(
        new Meteor.Error(
          `Failed to list channels of guild ${guildId}. ${response.statusText}`,
        ),
        { response: text },
      );
    }

    return response.json();
  };

  postMessageToChannel = async (channelId: string, message: object) => {
    let response: Response;
    try {
      const opts = this.authHeaders();
      opts.method = "POST";
      opts.body = JSON.stringify(message);
      opts.headers = { ...opts.headers, "Content-Type": "application/json" };
      response = await fetch(
        `${API_BASE}/channels/${channelId}/messages`,
        opts,
      );
    } catch (e) {
      throw new Meteor.Error(
        `Failed to post message to channel ${channelId}. ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw Object.assign(
        new Meteor.Error(
          `Failed to post message to channel ${channelId}. ${response.statusText}`,
        ),
        { response: text },
      );
    }
  };
}

const handleOauthRequest = async (query: any) => {
  const config = await ServiceConfiguration.configurations.findOneAsync({
    service: "discord",
  });
  if (!config) {
    throw new Meteor.Error("Missing service configuration for discord");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/oauth2/token`, {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.appId,
        client_secret: OAuth.openSecret(config.secret),
        grant_type: "authorization_code",
        code: query.code,
        redirect_uri: OAuth._redirectUri("discord", config),
        scope: DiscordOAuthScopes.join(" "),
      }),
    });
  } catch (e) {
    throw new Meteor.Error(
      `Failed to complete OAuth handshake with Discord. ${
        e instanceof Error ? e.message : e
      }`,
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(
      new Meteor.Error(
        `Failed to complete OAuth handshake with Discord. ${response.statusText}`,
      ),
      { response: text },
    );
  }

  const data = await response.json();

  return {
    serviceData: {
      accessToken: data.access_token,
      tokenType: data.token_type,
      refreshToken: data.refresh_token,
      receivedAt: new Date(),
      // `expiresIn` is the number of seconds since `receivedAt` at which this
      // access token expires.  The refresh token is presumably good
      // indefinitely.
      expiresIn: data.expires_in,
      scope: data.scope,
    },
  };
};

OAuth.registerService("discord", 2, null, handleOauthRequest);

export { DiscordAPIClient, DiscordBot };
