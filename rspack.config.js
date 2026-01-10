const { defineConfig } = require('@meteorjs/rspack');

/**
 * Rspack configuration for Meteor projects.
 *
 * Provides typed flags on the `Meteor` object, such as:
 * - `Meteor.isClient` / `Meteor.isServer`
 * - `Meteor.isDevelopment` / `Meteor.isProduction`
 * - …and other flags available
 *
 * Use these flags to adjust your build settings based on environment.
 */
module.exports = defineConfig(Meteor => {
  // winston tries to import path, so we need to stub it out here
  const fallbackClient = { path: require.resolve("path-browserify") };
  const fallbackServer = { bufferutil: false, "zlib-sync": false, "utf-8-validate": false };

  return {
    resolve: {
      fallback: Meteor.isClient ? fallbackClient : fallbackServer,
    },
  };
});
