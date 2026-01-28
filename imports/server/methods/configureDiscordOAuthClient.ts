import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { ServiceConfiguration } from "meteor/service-configuration";

import { API_BASE } from "../../lib/discord";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayConfigureDiscordOAuth } from "../../lib/permission_stubs";
import Logger from "../../Logger";
import configureDiscordOAuthClient from "../../methods/configureDiscordOAuthClient";
import defineMethod from "./defineMethod";

defineMethod(configureDiscordOAuthClient, {
  validate(arg) {
    check(arg, {
      clientId: Match.Optional(String),
      clientSecret: Match.Optional(String),
    });
    return arg;
  },

  async run({ clientId, clientSecret }) {
    check(this.userId, String);

    if (
      !userMayConfigureDiscordOAuth(await MeteorUsers.findOneAsync(this.userId))
    ) {
      throw new Meteor.Error(401, "Must be admin to configure Discord OAuth");
    }

    if (!clientId && !clientSecret) {
      Logger.info("Disabling discord oauth client");
      await ServiceConfiguration.configurations.removeAsync({
        service: "discord",
      });
      return;
    }

    Logger.info("Configuring discord oauth client", { clientId });

    // Test the client id/secret.
    const resp = await fetch(`${API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "identify",
      }),
    });

    if (resp.ok) {
      await ServiceConfiguration.configurations.upsertAsync(
        { service: "discord" },
        {
          $set: {
            appId: clientId,
            secret: clientSecret,
            loginStyle: "popup",
          },
        },
      );
    } else {
      const text = await resp.text();
      throw new Meteor.Error(`Discord credential test failed: ${text}`);
    }
  },
});
