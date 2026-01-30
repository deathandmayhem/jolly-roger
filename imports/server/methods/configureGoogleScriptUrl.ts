import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { checkAdmin } from "../../lib/permission_stubs";
import Logger from "../../Logger";
import configureGoogleScriptUrl from "../../methods/configureGoogleScriptUrl";
import defineMethod from "./defineMethod";

defineMethod(configureGoogleScriptUrl, {
  validate(arg) {
    check(arg, {
      url: Match.Optional(String),
    });
    return arg;
  },

  async run({ url }) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const app = await Settings.findOneAsync({ name: "google.script" });
    if (!app) {
      throw new Meteor.Error(404, "No image app configured");
    }

    if (!url) {
      Logger.info("Clearing Google Script URL");
      await Settings.updateAsync(
        { name: "google.script" },
        {
          $unset: {
            "value.endpointUrl": 1,
          },
        },
      );
      return;
    }

    const params = {
      secret: app.value.sharedSecret,
      method: "ping",
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Meteor.Error(
        400,
        "Failed to ping image app - are you sure you have the right URL?",
      );
    }
    const responseJson = await response.json();
    if (responseJson?.ok !== true) {
      throw new Meteor.Error(
        400,
        "Failed to ping image app - are you sure you have the right URL?",
      );
    }

    await Settings.updateAsync(
      { name: "google.script" },
      {
        $set: {
          "value.endpointUrl": url,
        },
      },
    );
  },
});
