import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { fetch } from 'meteor/fetch';
import { Meteor } from 'meteor/meteor';
import Bugsnag from '@bugsnag/js';
import Fiber from 'fibers';
import glob from 'glob';
import { SourceMapConsumer } from 'source-map';
import Ansible from '../Ansible';
import isAdmin from '../lib/isAdmin';
import { userIsOperatorForAnyHunt } from '../lib/permission_stubs';
import addRuntimeConfig from './addRuntimeConfig';
import onExit from './onExit';

const apiKey = process.env.BUGSNAG_API_KEY;

if (apiKey) {
  const releaseStage = Meteor.isDevelopment ? 'development' : 'production';

  // Record this release so that Bugsnag has tracking for when releases are
  // deployed
  Meteor.defer(async () => {
    try {
      const resp = await fetch('https://build.bugsnag.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          appVersion: Meteor.gitCommitHash,
          sourceControl: {
            provider: 'github',
            repository: 'https://github.com/deathandmayhem/jolly-roger',
            revision: Meteor.gitCommitHash,
          },
          releaseStage,
        }),
      });
      if (!resp.ok) {
        throw new Error(`Error from Bugsnag build API: ${await resp.text()}`);
      }
    } catch (error) {
      Ansible.error('Unable to report release to Bugsnag', { e: error });
      if (error instanceof Error && Bugsnag.isStarted()) {
        Bugsnag.notify(error, (event) => {
          // eslint-disable-next-line no-param-reassign
          event.severity = 'warning';
        });
      }
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
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'jolly-roger-'));
    onExit(async () => {
      await fs.rm(projectRoot!, { recursive: true });
    });

    // Our current working directory is programs/server/, which contains the
    // server-side code bundle
    const sourceMapPaths = await promisify(glob)('**/*.map', { cwd: process.cwd() });
    await Promise.all(sourceMapPaths.map(async (sourceMapPath) => {
      const sourceMapConsumer = await new SourceMapConsumer(await fs.readFile(sourceMapPath, 'utf8'));
      await Promise.all(sourceMapConsumer.sources.map(async (sourcePath) => {
        if (!sourcePath.startsWith('meteor://💻app/')) {
          return;
        }
        const source = sourceMapConsumer.sourceContentFor(sourcePath);
        if (!source) {
          return;
        }

        const strippedPath = sourcePath.slice('meteor://💻app/'.length);
        await fs.mkdir(path.join(projectRoot!, path.dirname(strippedPath)), { recursive: true });
        await fs.writeFile(path.join(projectRoot!, strippedPath), source);
      }));
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to create source tree for Bugsnag', error);
  }

  Bugsnag.start({
    apiKey,
    appVersion: Meteor.gitCommitHash,
    projectRoot,
    releaseStage,
    redactedKeys: [
      'password',
      'token',
      'clientId',
      'clientSecret',
      'key',
      'secret',
      'dtlsParameters',
    ],
    onError: (event) => {
      if (Fiber.current) {
        const user = Meteor.user();
        if (user) {
          event.setUser(user._id, user.emails?.[0]?.address, user.displayName);
          event.addMetadata('user', {
            admin: isAdmin(user),
            operator: userIsOperatorForAnyHunt(user),
          });
        }
      }
    },
  });

  addRuntimeConfig(() => {
    return { bugsnagApiKey: apiKey };
  });
}
