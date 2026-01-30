import { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { Random } from "meteor/random";
import { ServiceConfiguration } from "meteor/service-configuration";

import { API_BASE, DiscordOAuthScopes } from "../lib/discord";

// Pseudo-type used for encapsulating guild data
export type DiscordGuildType = {
  id: string;
  name: string;
};

// Pseudo-type used for encapsulating channel data
export type DiscordChannelType = {
  id: string;
  name: string;
  type: string;
  rawPosition: number | undefined;
};

export type DiscordRoleType = {
  id: string;
  guild: string;
  name: string;
  managed: boolean;
  rawPosition: number | undefined;
};

function requestDiscordCredential(credentialRequestCompleteCallback: any) {
  const options = {};
  const config = ServiceConfiguration.configurations.findOne({
    service: "discord",
  });
  if (!config) {
    if (credentialRequestCompleteCallback) {
      credentialRequestCompleteCallback(
        new Meteor.Error(400, "Discord service not configured"),
      );
    }
    return;
  }

  const credentialToken = Random.secret();
  const loginStyle = OAuth._loginStyle("discord", config, options || {});
  const loginUrlParameters = {
    response_type: "code",
    client_id: config.appId,
    scope: DiscordOAuthScopes.join(" "),
    redirect_uri: OAuth._redirectUri("discord", config),
    state: OAuth._stateParam(loginStyle, credentialToken, undefined),
  };
  const loginUrlParamString = Object.keys(loginUrlParameters)
    .map((param) => {
      return `${encodeURIComponent(param)}=${encodeURIComponent(
        (<any>loginUrlParameters)[param],
      )}`;
    })
    .join("&");
  const loginUrl = `${API_BASE}/oauth2/authorize?${loginUrlParamString}`;

  OAuth.launchLogin({
    loginService: "discord",
    loginStyle,
    loginUrl,
    credentialRequestCompleteCallback,
    credentialToken,
  });
}

export { requestDiscordCredential };
