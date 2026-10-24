import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fetch } from "meteor/fetch";
import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import Bugsnag from "@bugsnag/js";
import FormData from "form-data";
import { glob } from "glob";
import Logger from "../Logger";
import isAdmin from "../lib/isAdmin";
import MeteorUsers from "../lib/models/MeteorUsers";
import { primaryEmail } from "../lib/models/User";
import { huntsUserIsOperatorFor } from "../lib/permission_stubs";
import addRuntimeConfig from "./addRuntimeConfig";
import onExit from "./onExit";

interface SourceMap {
  sources: string[];
  sourcesContent: string[];
}

interface ProgramManifestFile {
  path: string;
  type: "js" | "dynamic js" | "json" | "css" | "asset";
  url: string;
  sourceMap?: string;
}

const apiKey = process.env.BUGSNAG_API_KEY;

async function fetchWithRetry(
  url: string,
  init: Parameters<typeof fetch>[1],
  maxAttempts = 4,
  initialDelayMs = 1000,
): Promise<Response> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let isRetryable = true;
    try {
      const resp = await fetch(url, init);
      if (!resp.ok) {
        // Fail fast on 4xx client errors (e.g. 400 Bad Request, 401 Unauthorized), except 429 Too
        // Many Requests
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
          isRetryable = false;
        }
        throw new Error(
          `Bugsnag API returned status ${resp.status}: ${await resp.text()}`,
        );
      }
      return resp;
    } catch (error) {
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }
      Logger.info(
        `Bugsnag API failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`,
        { error },
      );
      await setTimeout(delay);
      delay *= 2;
    }
  }
  throw new Error("Bugsnag request failed: exhausted retries");
}

if (apiKey) {
  const releaseStage = Meteor.isDevelopment ? "development" : "production";
  const repository =
    process.env.SOURCE_REPOSITORY ??
    "https://github.com/deathandmayhem/jolly-roger";

  // Record this release so that Bugsnag has tracking for when releases are
  // deployed
  Meteor.defer(async () => {
    try {
      await fetchWithRetry("https://build.bugsnag.com/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          appVersion: Meteor.gitCommitHash,
          sourceControl: {
            provider: "github",
            repository,
            revision: Meteor.gitCommitHash,
          },
          releaseStage,
        }),
      });
    } catch (error) {
      Logger.warn("Unable to report release to Bugsnag", { error });
    }
  });

  // If you supply a projectRoot, Bugsnag will attempt to find source code in
  // that directory and include it with the event report. This doesn't work for
  // us out of the box because we don't have the sourcecode present. However, we
  // do still have it in the form of sourcemaps, so we can use the sourcemaps to
  // materialize the source tree that Bugsnag expects in a temporary directory.
  //
  // (Note: we can't ask Bugsnag to use the sourcemaps itself because Meteor
  // already installs source-map-support, which means that exceptions have
  // already had source map transformations applied.)
  let projectRoot: string | undefined;
  try {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "jolly-roger-"));
    onExit(async () => {
      await fs.rm(projectRoot!, { recursive: true });
    });

    // Our current working directory is programs/server/, which contains the
    // server-side code bundle
    const sourceMapPaths = await glob("**/*.map", {
      cwd: process.cwd(),
    });
    await Promise.all(
      sourceMapPaths.map(async (sourceMapPath) => {
        const sourceMap = JSON.parse(
          await fs.readFile(sourceMapPath, "utf8"),
        ) as SourceMap;
        await Promise.all(
          sourceMap.sources.map(async (sourcePath, i) => {
            if (!sourcePath.startsWith("meteor://💻app/")) {
              return;
            }
            const source = sourceMap.sourcesContent[i];
            if (!source) {
              return;
            }

            const strippedPath = sourcePath.slice("meteor://💻app/".length);
            await fs.mkdir(
              path.join(projectRoot!, path.dirname(strippedPath)),
              { recursive: true },
            );
            await fs.writeFile(path.join(projectRoot!, strippedPath), source);
          }),
        );
      }),
    );
  } catch (error) {
    Logger.error("Unable to create source tree for Bugsnag", { error });
  }

  // Upload client-side source maps to Bugsnag in the background. We can't use
  // Bugsnag's standard uploader because files are not served with the same name
  // they have on disk, so we need to translate through program.json.
  Meteor.defer(async () => {
    for (const [arch, spec] of Object.entries(WebApp.clientPrograms)) {
      const manifest = spec.manifest as ProgramManifestFile[];
      for (const file of manifest) {
        if (file.type !== "js" && file.type !== "dynamic js") {
          continue;
        }
        if (!file.sourceMap) {
          continue;
        }

        // Strip any query parameters from the URL, because Bugsnag does on
        // incoming errors
        const minifiedUrl = new URL(Meteor.absoluteUrl(file.url));
        minifiedUrl.search = "";

        // For consistency, strip the meteor://💻app/ prefix from the source
        // names
        const sourceMapContents = await fs.readFile(
          path.join(process.cwd(), "..", arch, file.sourceMap),
          "utf8",
        );
        // Strip the anti-XSSI prefix
        const sourceMap = JSON.parse(
          sourceMapContents.replace(/^\)\]\}'/, ""),
        ) as SourceMap;
        sourceMap.sources = sourceMap.sources.map((source) =>
          source.replace("meteor://💻app/", ""),
        );

        const formData = new FormData();
        formData.append("apiKey", apiKey);
        formData.append("appVersion", Meteor.gitCommitHash);
        formData.append("minifiedUrl", minifiedUrl.toString());
        formData.append(
          "minifiedFile",
          await fs.readFile(path.join(process.cwd(), "..", arch, file.path)),
          { filename: file.path },
        );
        formData.append("sourceMap", JSON.stringify(sourceMap), {
          filename: file.sourceMap,
        });
        formData.append("overwrite", "true");
        try {
          await fetchWithRetry("https://upload.bugsnag.com/", {
            method: "POST",
            headers: formData.getHeaders(),
            body: formData.getBuffer() as Buffer<ArrayBuffer>,
          });
        } catch (error) {
          Logger.warn("Unable to upload source map to Bugsnag", { error });
          return;
        }
      }
    }
  });

  Bugsnag.start({
    apiKey,
    appVersion: Meteor.gitCommitHash,
    projectRoot,
    releaseStage,
    redactedKeys: [
      "password",
      "token",
      "clientId",
      "clientSecret",
      "key",
      "secret",
      "dtlsParameters",
    ],
    onError: async (event) => {
      let user;
      try {
        const userId = Meteor.userId();
        if (userId) {
          user = await MeteorUsers.findOneAsync(userId);
        }
      } catch {
        // must not be in a method/publish call
      }
      if (user) {
        event.setUser(user._id, primaryEmail(user), user.displayName);
        event.addMetadata("user", {
          admin: isAdmin(user),
          operator: huntsUserIsOperatorFor(user),
        });
      }
    },
  });

  addRuntimeConfig(() => {
    return { bugsnagApiKey: apiKey };
  });
}
