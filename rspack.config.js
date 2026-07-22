const { defineConfig } = require("@meteorjs/rspack");
const { IgnorePlugin } = require("@rspack/core");

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
        // Only the CSS needs PostCSS: scope-tailwind acts on the base,
        // components, and utilities layers, and Bootstrap sits in its own.
        ...(Meteor.isClient
          ? [
              {
                test: /\.css$/,
                use: ["postcss-loader"],
                type: "css",
              },
              {
                test: /\.scss$/,
                use: ["sass-loader"],
                type: "css",
              },
            ]
          : []),
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
    // ws and discord.js dynamic-import these optional native deps and
    // rely on a missing module throwing. resolve.fallback: false produces
    // a truthy empty stub instead, which discord.js's `if (zlib)` check
    // mistakes for a working zlib-sync.
    plugins: Meteor.isServer
      ? [
          new IgnorePlugin({
            resourceRegExp: /^(zlib-sync|bufferutil|utf-8-validate)$/,
          }),
        ]
      : [],
  };
});
