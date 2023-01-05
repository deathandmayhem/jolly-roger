// Work around a bug in Meteor's runtime config hooks (which will only run a
// single hook) by accumulating our own list

import { WebApp } from 'meteor/webapp';

type Config = Record<string, any>;

const hooks: (() => Config)[] = [];

export default function addRuntimeConfig(hook: () => Config) {
  hooks.push(hook);
}

WebApp.addRuntimeConfigHook(({ encodedCurrentConfig }) => {
  let config = WebApp.decodeRuntimeConfig(encodedCurrentConfig) as Config;
  for (const hook of hooks) {
    config = { ...config, ...hook() };
  }
  return WebApp.encodeRuntimeConfig(config);
});
