import os from 'os';
import { Meteor } from 'meteor/meteor';
import Libhoney from 'libhoney';

class DummyTransport {
  sendEvent() {}
}

const writeKey = process.env.HONEYCOMB_WRITE_KEY || Meteor.settings.honeycombWriteKey;

const honey = new Libhoney({
  writeKey: writeKey || 'dummy',
  transmission: writeKey ? 'base' : DummyTransport,
});

const honeyBuilder = honey.newBuilder({
  hostname: os.hostname(),
  pid: process.pid,
  production: Meteor.isProduction,
});

if (process.env.GIT_REVISION) {
  honeyBuilder.add({
    revision: process.env.GIT_REVISION,
  });
}

export { honey, honeyBuilder };
