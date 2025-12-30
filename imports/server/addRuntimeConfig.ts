// Our usage of Meteor's runtime config hooks is only to augment additional
// fields, so add a wrapper which makes doing that a little more
// straightforward. (This was originally introduced to work around a limitation
// that you could only have a single runtime config hook. That's since been
// fixed, but the abstraction is still useful.)

import { WebApp } from "meteor/webapp";

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
