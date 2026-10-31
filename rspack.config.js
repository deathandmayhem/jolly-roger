const { defineConfig } = require("@meteorjs/rspack");
const { IgnorePlugin } = require("@rspack/core");
const { CheckSyntaxRspackPlugin } = require("@rsbuild/plugin-check-syntax");

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
  const fallbackClient = {
    events: require.resolve("meteor-node-stubs/node_modules/events/events.js"),
    path: require.resolve("path-browserify"),
    util: require.resolve("meteor-node-stubs/node_modules/util/util.js"),
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
      fallback: Meteor.isClient ? fallbackClient : {},
    },
    externals: {
      express: "commonjs express",
      mediasoup: "commonjs mediasoup",
      slate: "commonjs slate",
    },
    plugins: [
      // ws and discord.js dynamic-import these optional native deps and
      // rely on a missing module throwing. resolve.fallback: false produces
      // a truthy empty stub instead, which discord.js's `if (zlib)` check
      // mistakes for a working zlib-sync.
      ...(Meteor.isServer
        ? [
            new IgnorePlugin({
              resourceRegExp: /^(zlib-sync|bufferutil|utf-8-validate)$/,
            }),
          ]
        : []),
      // We don't transpile dependencies, so make sure browsers we support can
      // parse what we ship. (This reads the emitted files from disk, which the
      // dev server doesn't write)
      ...(Meteor.isClient && (Meteor.isProduction || Meteor.isTest)
        ? [new CheckSyntaxRspackPlugin({ ecmaVersion: 2022 })]
        : []),
    ],
  };
});
