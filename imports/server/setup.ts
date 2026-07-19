import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import Logger from "../Logger";
import isAdmin from "../lib/isAdmin";
import MeteorUsers from "../lib/models/MeteorUsers";
import type { SettingType } from "../lib/models/Settings";
import Settings from "../lib/models/Settings";
import googleScriptContent from "./googleScriptContent";
import UploadTokens from "./models/UploadTokens";

// Clean up upload tokens that didn't get used within a minute
async function cleanupUploadTokens() {
  const oldestValidTime = new Date(Date.now() - 60 * 1000);
  await UploadTokens.removeAsync({ createdAt: { $lt: oldestValidTime } });
}
async function periodic() {
  Meteor.setTimeout(periodic, 15000 + 15000 * Random.fraction());
  await cleanupUploadTokens();
}
Meteor.startup(() => periodic());

Meteor.publish("hasUsers", async function () {
  // Publish a pseudo-collection which just communicates if there are any users
  // at all, so we can either guide users through the server setup flow or just
  // point them at the login page.
  const cursor = MeteorUsers.find();
  if ((await cursor.countAsync()) > 0) {
    this.added("hasUsers", "hasUsers", { hasUsers: true });
  } else {
    let handle: Meteor.LiveQueryHandle | undefined =
      await cursor.observeChangesAsync({
        added: (_id) => {
          this.added("hasUsers", "hasUsers", { hasUsers: true });
          if (handle) {
            handle.stop();
          }
          handle = undefined;
        },
      });
    this.onStop(() => {
      if (handle) {
        handle.stop();
      }
    });
  }

  this.ready();
});

Meteor.publish("teamName", async function () {
  const cursor = Settings.find({ name: "teamname" });
  let tracked = false;
  const handle: Meteor.LiveQueryHandle = await cursor.observeAsync({
    added: (doc) => {
      tracked = true;
      this.added("teamName", "teamName", { name: doc.value.teamName });
    },
    changed: (newDoc) => {
      this.changed("teamName", "teamName", { name: newDoc.value.teamName });
    },
    removed: () => {
      if (tracked) {
        this.removed("teamName", "teamName");
      }
    },
  });
  this.onStop(() => {
    handle.stop();
  });

  this.ready();
});

Meteor.publish("enabledChatImage", async function () {
  const cursor = Settings.find({ name: "s3.image_bucket" });
  let tracked = false;
  const handle: Meteor.LiveQueryHandle = await cursor.observeAsync({
    added: (doc) => {
      tracked = true;
      this.added("enabledChatImage", "enabledChatImage", {
        enabled: doc.value.bucketName !== undefined,
      });
    },
    changed: (newDoc) => {
      this.changed("enabledChatImage", "enabledChatImage", {
        enabled: newDoc.value.bucketName !== undefined,
      });
    },
    removed: () => {
      if (tracked) {
        this.removed("enabledChatImage", "enabledChatImage");
      }
    },
  });
  this.onStop(() => {
    handle.stop();
  });

  this.ready();
});

/**
 * Build the candidate URLs to try for browser-side third-party cookie
 * detection.
 *
 * We extract the deployment ID from the configured URL and build two additional
 * derived URLs for clients to try. The basic URL should match the configured
 * URL (but we rebuild it just in case). The URL with "/a/~/" is a workaround
 * for users who are logged in to a multi-login session (taken from
 * https://groups.google.com/g/google-apps-script-community/c/1xrlqlkGEQ0). But
 * we need both because the /a/~/ URL doesn't work with Google Workspace domain
 * accounts (it redirects to /a/<domain>/a/~/ which 404s).
 */
function googleScriptCookieCheckUrls(
  endpointUrl: string | undefined,
): string[] | undefined {
  if (!endpointUrl) return undefined;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(endpointUrl);
  } catch {
    // Unparseable URL: hand it back as-is and let the client try to load it.
    return [endpointUrl];
  }
  // Always try the configured URL itself, then additionally construct our two
  // redirect-workaround variants.
  const candidates = [parsedUrl.toString()];
  const match = /\/s\/([^/]+)\/exec(?:\/|$)/.exec(parsedUrl.pathname);
  if (parsedUrl.hostname === "script.google.com" && match) {
    const deploymentId = match[1];
    candidates.push(
      `${parsedUrl.origin}/macros/s/${deploymentId}/exec`,
      `${parsedUrl.origin}/a/~/macros/s/${deploymentId}/exec`,
    );
  }
  return [...new Set(candidates)];
}

Meteor.publish("googleScriptInfo", async function () {
  if (!this.userId) {
    return [];
  }

  const admin = isAdmin(await MeteorUsers.findOneAsync(this.userId));

  const cursor = Settings.find({ name: "google.script" });
  let tracked = false;
  const formatDoc = async (doc: SettingType & { name: "google.script" }) => {
    const configured = !!doc.value.scriptId && !!doc.value.endpointUrl;
    const cookieCheckUrls = googleScriptCookieCheckUrls(doc.value.endpointUrl);
    if (admin) {
      const { contentHash } = await googleScriptContent(doc.value.sharedSecret);
      return {
        configured,
        outOfDate: doc.value.contentHash !== contentHash,
        cookieCheckUrls,
      };
    }
    return { configured, cookieCheckUrls };
  };
  const handle: Meteor.LiveQueryHandle = await cursor.observeAsync({
    added: (doc) => {
      (async () => {
        tracked = true;
        this.added(
          "googleScriptInfo",
          "googleScriptInfo",
          await formatDoc(doc),
        );
      })().catch((error) => {
        Logger.error("googleScriptInfo added() failed", { error });
        this.error(error);
      });
    },
    changed: (newDoc) => {
      (async () => {
        this.changed(
          "googleScriptInfo",
          "googleScriptInfo",
          await formatDoc(newDoc),
        );
      })().catch((error) => {
        Logger.error("googleScriptInfo changed() failed", { error });
        this.error(error);
      });
    },
    removed: () => {
      if (tracked) {
        this.removed("googleScriptInfo", "googleScriptInfo");
      }
    },
  });
  this.onStop(() => {
    handle.stop();
  });

  this.ready();
  return undefined;
});
