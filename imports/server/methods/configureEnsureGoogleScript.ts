import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";

import type { script_v1 } from "@googleapis/script";

import MeteorUsers from "../../lib/models/MeteorUsers";
import type { SettingType } from "../../lib/models/Settings";
import Settings from "../../lib/models/Settings";
import { checkAdmin } from "../../lib/permission_stubs";
import configureEnsureGoogleScript from "../../methods/configureEnsureGoogleScript";
import GoogleClient from "../googleClientRefresher";
import googleScriptContent from "../googleScriptContent";
import defineMethod from "./defineMethod";

defineMethod(configureEnsureGoogleScript, {
  async run() {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const { script } = GoogleClient;
    if (!script) {
      throw new Meteor.Error("Google client not ready");
    }

    let app = await Settings.findOneAsync({ name: "google.script" });
    const secret = app?.value.sharedSecret ?? Random.secret();
    const appContent = await googleScriptContent(secret);
    if (!app) {
      let resp;
      try {
        resp = await script.projects.create({
          requestBody: {
            title: "Jolly Roger Google Script Integration",
          },
        });
      } catch (e) {
        throw new Meteor.Error(
          400,
          `Error while creating Google Apps Script project: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
      const scriptId = resp.data.scriptId!;
      await script.projects.updateContent({
        scriptId,
        requestBody: appContent.content,
      });
      await Settings.upsertAsync(
        { name: "google.script" },
        {
          $set: {
            "value.scriptId": scriptId,
            "value.sharedSecret": secret,
            "value.contentHash": appContent.contentHash,
          },
        },
      );
      app = (await Settings.findOneAsync({
        name: "google.script",
      })) as SettingType & { name: "google.script" };
    }

    if (!app) {
      throw new Meteor.Error(500, "Failed to create Google Script");
    }

    if (app.value.contentHash !== appContent.contentHash) {
      const { scriptId } = app.value;
      await script.projects.updateContent({
        scriptId,
        requestBody: appContent.content,
      });

      const versionResponse = await script.projects.versions.create({
        scriptId,
      });
      const versionNumber = versionResponse.data.versionNumber!;

      let pageToken: string | undefined;
      const deployments: script_v1.Schema$Deployment[] = [];
      do {
        const deploymentsResponse = await script.projects.deployments.list({
          scriptId,
          pageToken,
        });
        deployments.push(...(deploymentsResponse.data.deployments ?? []));
        pageToken = deploymentsResponse.data.nextPageToken ?? undefined;
      } while (pageToken);

      for (const d of deployments) {
        if (!d.deploymentConfig?.versionNumber) {
          // No version number means this is a HEAD deployment
          continue;
        }

        await script.projects.deployments.update({
          scriptId,
          deploymentId: d.deploymentId!,
          requestBody: {
            deploymentConfig: {
              versionNumber,
            },
          },
        });
      }

      await Settings.updateAsync(
        { name: "google.script" },
        {
          $set: {
            "value.contentHash": appContent.contentHash,
          },
        },
      );
    }
  },
});
