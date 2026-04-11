const { defineConfig } = require("@meteorjs/rspack");

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
module.exports = defineConfig((Meteor) => {
  // winston tries to import path, so we need to stub it out here
  const fallbackClient = { path: require.resolve("path-browserify") };
  const fallbackServer = {
    bufferutil: false,
    "zlib-sync": false,
    "utf-8-validate": false,
  };

  return {
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: [/node_modules|\.meteor\/local/],
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript",
                tsx: true,
              },
              transform: {
                react: {
                  runtime: "automatic",
                },
              },
              experimental: {
                plugins: [
                  [
                    "@swc/plugin-styled-components",
                    {
                      displayName: true,
                    },
                  ],
                ],
              },
            },
          },
          type: "javascript/auto",
        },
      ],
    },
    resolve: {
      fallback: Meteor.isClient ? fallbackClient : fallbackServer,
    },
    externals: {
      mediasoup: "commonjs mediasoup",
    },
  };
});
